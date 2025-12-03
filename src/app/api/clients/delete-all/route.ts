import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow ADMIN role to delete all data
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only administrators can perform this action" },
        { status: 403 }
      );
    }

    // Delete in order due to foreign key constraints:
    // 1. First delete all payments
    const paymentsDeleted = await prisma.paymentReceived.deleteMany({});

    // 2. Delete all invoice items
    await prisma.invoiceItem.deleteMany({});

    // 3. Delete all invoices
    const invoicesDeleted = await prisma.invoice.deleteMany({});

    // 4. Delete all clients
    const clientsDeleted = await prisma.client.deleteMany({});

    // Log this critical action
    await prisma.transactionLog.create({
      data: {
        entityType: "CLIENT",
        entityId: "BULK_DELETE",
        action: "DELETE",
        details: {
          message: `Bulk deleted all clients`,
          clientsDeleted: clientsDeleted.count,
          invoicesDeleted: invoicesDeleted.count,
          paymentsDeleted: paymentsDeleted.count,
        },
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      clientsDeleted: clientsDeleted.count,
      invoicesDeleted: invoicesDeleted.count,
      paymentsDeleted: paymentsDeleted.count,
    });
  } catch (error) {
    console.error("Error deleting all clients:", error);
    return NextResponse.json(
      { error: "Failed to delete all data" },
      { status: 500 }
    );
  }
}
