import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextSequence } from "@/lib/sequences";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma, InvoiceStatus } from "@prisma/client";

// GET - List invoices with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status") as InvoiceStatus | null;
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * pageSize;

    const where: Prisma.InvoiceWhereInput = {};

    if (clientId) {
      where.clientId = clientId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { client: { name: { contains: search, mode: "insensitive" } } },
        { client: { clientId: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          client: {
            select: { id: true, clientId: true, name: true, phone: true },
          },
          createdBy: { select: { id: true, name: true } },
          updatedBy: { select: { id: true, name: true } },
          items: true,
          paymentsReceived: {
            select: { id: true, amount: true, paymentDate: true },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json({
      data: invoices,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// POST - Create new invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, dueDate, notes, items } = body;

    if (!clientId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Client ID and items are required" },
        { status: 400 }
      );
    }

    // Get client's previous unpaid balance
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        invoices: {
          where: { status: { in: ["UNPAID", "PARTIAL"] } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Calculate previous balance from unpaid invoices
    const previousBalance = client.invoices.reduce(
      (sum, inv) => sum + inv.balanceDue,
      0
    );

    // Get the last unpaid invoice for reference
    const previousInvoice = client.invoices[0] || null;

    // Generate invoice number
    const invoiceNumber = await getNextSequence("INVOICE");

    // Calculate item totals
    interface ItemInput {
      itemName: string;
      width: number;
      height: number;
      quantity: number;
      rate: number;
    }

    const processedItems = items.map((item: ItemInput, index: number) => {
      const sqf = item.width * item.height * item.quantity;
      const amount = sqf * item.rate;
      return {
        sNo: index + 1,
        itemName: item.itemName,
        width: item.width,
        height: item.height,
        quantity: item.quantity,
        sqf,
        rate: item.rate,
        amount,
      };
    });

    const subtotal = processedItems.reduce(
      (sum: number, item: { amount: number }) => sum + item.amount,
      0
    );
    const totalAmount = subtotal + previousBalance;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId,
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal,
        previousBalance,
        totalAmount,
        paidAmount: 0,
        balanceDue: totalAmount,
        status: "UNPAID",
        notes,
        previousInvoiceId: previousInvoice?.id || null,
        createdById: session.user.id,
        items: {
          create: processedItems,
        },
      },
      include: {
        client: { select: { id: true, clientId: true, name: true } },
        items: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Create transaction log
    await prisma.transactionLog.create({
      data: {
        entityType: "INVOICE",
        entityId: invoice.id,
        action: "CREATE",
        userId: session.user.id,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          clientName: client.name,
          totalAmount: invoice.totalAmount,
          previousBalance: invoice.previousBalance,
          itemsCount: items.length,
        },
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
