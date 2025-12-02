import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Get single invoice with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        items: { orderBy: { sNo: "asc" } },
        paymentsReceived: {
          include: {
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { paymentDate: "desc" },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        previousInvoice: {
          select: { id: true, invoiceNumber: true, balanceDue: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

// PUT - Update invoice (only if unpaid)
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
    const { dueDate, notes, items, status } = body;

    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Don't allow editing if payments have been made (unless just cancelling)
    if (existingInvoice.paidAmount > 0 && status !== "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot edit invoice with payments" },
        { status: 400 }
      );
    }

    // If status change to CANCELLED
    if (status === "CANCELLED" && existingInvoice.status !== "CANCELLED") {
      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          status: "CANCELLED",
          updatedById: session.user.id,
        },
      });

      await prisma.transactionLog.create({
        data: {
          entityType: "INVOICE",
          entityId: id,
          action: "STATUS_CHANGE",
          userId: session.user.id,
          details: {
            invoiceNumber: existingInvoice.invoiceNumber,
            from: existingInvoice.status,
            to: "CANCELLED",
          },
        },
      });

      return NextResponse.json(invoice);
    }

    // Update items if provided
    if (items && items.length > 0) {
      // Delete existing items
      await prisma.invoiceItem.deleteMany({
        where: { invoiceId: id },
      });

      // Calculate new totals
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
          invoiceId: id,
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
      const totalAmount = subtotal + existingInvoice.previousBalance;
      const balanceDue = totalAmount - existingInvoice.paidAmount;

      await prisma.invoiceItem.createMany({
        data: processedItems,
      });

      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          dueDate: dueDate ? new Date(dueDate) : existingInvoice.dueDate,
          notes,
          subtotal,
          totalAmount,
          balanceDue,
          updatedById: session.user.id,
        },
        include: {
          items: true,
          client: true,
        },
      });

      await prisma.transactionLog.create({
        data: {
          entityType: "INVOICE",
          entityId: id,
          action: "UPDATE",
          userId: session.user.id,
          details: {
            invoiceNumber: invoice.invoiceNumber,
            subtotal: invoice.subtotal,
            totalAmount: invoice.totalAmount,
            itemsCount: items.length,
          },
        },
      });

      return NextResponse.json(invoice);
    }

    // Simple update without items
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        dueDate: dueDate ? new Date(dueDate) : existingInvoice.dueDate,
        notes,
        updatedById: session.user.id,
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

// DELETE - Delete invoice (only if no payments received)
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

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        paymentsReceived: true,
        items: true,
        labourCosts: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Don't allow deletion if payments have been made
    if (invoice.paymentsReceived.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete invoice with payments. Cancel the invoice instead.",
        },
        { status: 400 }
      );
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete labour costs
      await tx.labourCost.deleteMany({
        where: { invoiceId: id },
      });

      // Delete items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id },
      });

      // Delete invoice
      await tx.invoice.delete({
        where: { id },
      });

      // Create transaction log
      await tx.transactionLog.create({
        data: {
          entityType: "INVOICE",
          entityId: id,
          action: "DELETE",
          userId: session.user.id,
          details: {
            invoiceNumber: invoice.invoiceNumber,
            clientName: invoice.client.name,
            totalAmount: invoice.totalAmount,
            reason: "Invoice deleted",
          },
        },
      });
    });

    return NextResponse.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    );
  }
}
