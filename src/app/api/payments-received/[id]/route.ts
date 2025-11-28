import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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
