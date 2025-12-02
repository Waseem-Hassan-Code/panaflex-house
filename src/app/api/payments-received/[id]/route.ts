import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Get single payment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const payment = await prisma.paymentReceived.findUnique({
      where: { id },
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
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment" },
      { status: 500 }
    );
  }
}

// PUT - Update payment (only method, reference, notes - not amount)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { paymentMethod, reference, notes } = body;

    const payment = await prisma.paymentReceived.findUnique({
      where: { id },
      include: { invoice: true, client: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const updatedPayment = await prisma.paymentReceived.update({
      where: { id },
      data: {
        paymentMethod: paymentMethod || payment.paymentMethod,
        reference,
        notes,
      },
      include: {
        client: { select: { id: true, clientId: true, name: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
      },
    });

    // Create transaction log
    await prisma.transactionLog.create({
      data: {
        entityType: "PAYMENT",
        entityId: id,
        action: "UPDATE",
        userId: session.user.id,
        details: {
          receiptNumber: payment.receiptNumber,
          invoiceNumber: payment.invoice.invoiceNumber,
          clientName: payment.client.name,
          changes: { paymentMethod, reference, notes },
        },
      },
    });

    return NextResponse.json(updatedPayment);
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}

// DELETE - Delete payment (only if allowed)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const payment = await prisma.paymentReceived.findUnique({
      where: { id },
      include: {
        invoice: true,
        client: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Delete payment and update invoice in transaction
    await prisma.$transaction(async (tx) => {
      // Update invoice
      const newPaidAmount = payment.invoice.paidAmount - payment.amount;
      const newBalanceDue = payment.invoice.totalAmount - newPaidAmount;
      const newStatus = newPaidAmount <= 0 ? "UNPAID" : "PARTIAL";

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          paidAmount: Math.max(0, newPaidAmount),
          balanceDue: newBalanceDue,
          status: newStatus,
          updatedById: session.user.id,
        },
      });

      // Delete the payment
      await tx.paymentReceived.delete({
        where: { id },
      });

      // Create transaction log
      await tx.transactionLog.create({
        data: {
          entityType: "PAYMENT",
          entityId: id,
          action: "DELETE",
          userId: session.user.id,
          details: {
            receiptNumber: payment.receiptNumber,
            invoiceNumber: payment.invoice.invoiceNumber,
            clientName: payment.client.name,
            amount: payment.amount,
            reason: "Payment deleted",
          },
        },
      });
    });

    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (error) {
    console.error("Error deleting payment:", error);
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}
