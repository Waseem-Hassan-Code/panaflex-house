import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextSequence } from "@/lib/sequences";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPhoneSearchVariants } from "@/lib/phoneUtils";

// GET - List clients with pagination and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * pageSize;

    // Build search conditions including smart phone search
    let where: any = {};
    if (search) {
      const phoneVariants = getPhoneSearchVariants(search);
      const phoneConditions = phoneVariants.map((variant) => ({
        phone: { contains: variant },
      }));
      where = {
        OR: [
          { name: { contains: search } },
          { clientId: { contains: search } },
          { email: { contains: search } },
          { cnic: { contains: search } },
          // Add all phone format variants
          ...phoneConditions,
        ],
      };
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          updatedBy: { select: { id: true, name: true, email: true } },
          invoices: {
            select: {
              id: true,
              balanceDue: true,
              status: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
      }),
      prisma.client.count({ where }),
    ]);

    // Calculate total balance for each client
    const clientsWithBalance = clients.map((client) => {
      const totalBalance = client.invoices.reduce(
        (sum, inv) => sum + inv.balanceDue,
        0
      );
      return {
        ...client,
        totalBalance,
      };
    });

    return NextResponse.json({
      data: clientsWithBalance,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

// POST - Create new client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      address,
      cnic,
      previousBalance,
      voucherNumber,
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    // Generate auto client ID
    const clientId = await getNextSequence("CLIENT");

    // Use transaction if there's a previous balance to handle
    const hasPreviousBalance = previousBalance && previousBalance > 0;

    if (hasPreviousBalance) {
      // Use transaction to create client and voucher together
      const result = await prisma.$transaction(async (tx) => {
        // Create client
        const client = await tx.client.create({
          data: {
            clientId,
            name,
            email,
            phone,
            address,
            cnic,
            createdById: session.user.id,
          },
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
          },
        });

        // Generate voucher number if not provided
        let finalVoucherNumber = voucherNumber?.trim();
        if (!finalVoucherNumber) {
          finalVoucherNumber = await getNextSequence("VOUCHER");
        }

        // Create invoice for previous balance
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber: finalVoucherNumber,
            clientId: client.id,
            invoiceDate: new Date(),
            subtotal: previousBalance,
            totalAmount: previousBalance,
            balanceDue: previousBalance,
            status: "UNPAID",
            notes: "Previous Balance - Opening balance",
            createdById: session.user.id,
          },
        });

        // Create transaction log for client
        await tx.transactionLog.create({
          data: {
            entityType: "CLIENT",
            entityId: client.id,
            action: "CREATE",
            userId: session.user.id,
            details: {
              clientId: client.clientId,
              name: client.name,
              phone: client.phone,
            },
          },
        });

        // Create transaction log for previous balance invoice
        await tx.transactionLog.create({
          data: {
            entityType: "INVOICE",
            entityId: invoice.id,
            action: "CREATE",
            userId: session.user.id,
            details: {
              invoiceNumber: invoice.invoiceNumber,
              clientName: client.name,
              totalAmount: invoice.totalAmount,
              type: "Previous Balance",
            },
          },
        });

        return { client, invoice };
      });

      return NextResponse.json(result.client, { status: 201 });
    } else {
      // No previous balance - simple client creation
      const client = await prisma.client.create({
        data: {
          clientId,
          name,
          email,
          phone,
          address,
          cnic,
          createdById: session.user.id,
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      // Create transaction log
      await prisma.transactionLog.create({
        data: {
          entityType: "CLIENT",
          entityId: client.id,
          action: "CREATE",
          userId: session.user.id,
          details: {
            clientId: client.clientId,
            name: client.name,
            phone: client.phone,
          },
        },
      });

      return NextResponse.json(client, { status: 201 });
    }
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
