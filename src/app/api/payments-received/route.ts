import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextSequence } from "@/lib/sequences";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - List payments received with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const clientId = searchParams.get("clientId");
    const invoiceId = searchParams.get("invoiceId");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * pageSize;

    interface WhereClause {
      clientId?: string;
      invoiceId?: string;
      OR?: Array<{
        receiptNumber?: { contains: string };
        client?: {
          name?: { contains: string };
          clientId?: { contains: string };
        };
        invoice?: { invoiceNumber?: { contains: string } };
      }>;
    }

    const where: WhereClause = {};

    if (clientId) {
      where.clientId = clientId;
    }

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    if (search) {
      where.OR = [
        { receiptNumber: { contains: search } },
        { client: { name: { contains: search } } },
        { client: { clientId: { contains: search } } },
        { invoice: { invoiceNumber: { contains: search } } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.paymentReceived.findMany({
        where,
        include: {
          client: {
            select: { id: true, clientId: true, name: true, phone: true },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              balanceDue: true,
            },
          },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
      }),
      prisma.paymentReceived.count({ where }),
    ]);

    return NextResponse.json({
      data: payments,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST - Receive payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, invoiceId, amount, paymentMethod, reference, notes } =
      body;

    if (!clientId || !invoiceId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Client ID, Invoice ID and valid amount are required" },
        { status: 400 }
      );
    }

    // Get the invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.clientId !== clientId) {
      return NextResponse.json(
        { error: "Invoice does not belong to this client" },
        { status: 400 }
      );
    }

    if (invoice.status === "PAID") {
      return NextResponse.json(
        { error: "Invoice is already fully paid" },
        { status: 400 }
      );
    }

    if (invoice.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot receive payment for cancelled invoice" },
        { status: 400 }
      );
    }

    // Calculate overpayment (extra amount beyond invoice balance)
    const overpayment = Math.max(0, amount - invoice.balanceDue);
    const actualPaymentForInvoice = amount - overpayment;

    // Generate receipt number
    const receiptNumber = await getNextSequence("RECEIPT");

    // Create payment within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.paymentReceived.create({
        data: {
          receiptNumber,
          clientId,
          invoiceId,
          amount,
          paymentMethod: paymentMethod || "CASH",
          reference,
          notes:
            overpayment > 0
              ? `${
                  notes || ""
                } [Overpayment of Rs. ${overpayment} added to credit balance]`.trim()
              : notes,
          createdById: session.user.id,
        },
        include: {
          client: {
            select: {
              id: true,
              clientId: true,
              name: true,
              creditBalance: true,
            },
          },
          invoice: { select: { id: true, invoiceNumber: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      // Update invoice
      const newPaidAmount = invoice.paidAmount + actualPaymentForInvoice;
      const newBalanceDue = invoice.totalAmount - newPaidAmount;
      const newStatus = newBalanceDue <= 0 ? "PAID" : "PARTIAL";

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: Math.max(0, newBalanceDue),
          status: newStatus,
          updatedById: session.user.id,
        },
      });

      // If there's overpayment, add to client's credit balance
      if (overpayment > 0) {
        const client = await tx.client.findUnique({
          where: { id: clientId },
          select: { creditBalance: true },
        });

        await tx.client.update({
          where: { id: clientId },
          data: {
            creditBalance: (client?.creditBalance || 0) + overpayment,
            updatedById: session.user.id,
          },
        });
      }

      // Create transaction log
      await tx.transactionLog.create({
        data: {
          entityType: "PAYMENT",
          entityId: payment.id,
          action: "PAYMENT_RECEIVED",
          userId: session.user.id,
          details: {
            receiptNumber: payment.receiptNumber,
            invoiceNumber: invoice.invoiceNumber,
            clientName: invoice.client.name,
            amount: payment.amount,
            appliedToInvoice: actualPaymentForInvoice,
            overpayment: overpayment,
            paymentMethod: payment.paymentMethod,
            newInvoiceStatus: newStatus,
            remainingBalance: Math.max(0, newBalanceDue),
          },
        },
      });

      return {
        ...payment,
        overpayment,
        appliedToInvoice: actualPaymentForInvoice,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error receiving payment:", error);
    return NextResponse.json(
      { error: "Failed to receive payment" },
      { status: 500 }
    );
  }
}
