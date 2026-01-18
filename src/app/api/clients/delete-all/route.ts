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

    // Perform all deletions in a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Delete in order due to foreign key constraints:
      
      // 1. Delete all transaction logs (including logs for clients, invoices, payments, etc.)
      const logsDeleted = await tx.transactionLog.deleteMany({});

      // 2. Delete all labour costs
      const labourCostsDeleted = await tx.labourCost.deleteMany({});

      // 3. Delete all payments received
      const paymentsDeleted = await tx.paymentReceived.deleteMany({});

      // 4. Delete all invoice items
      const invoiceItemsDeleted = await tx.invoiceItem.deleteMany({});

      // 5. Delete all invoices
      const invoicesDeleted = await tx.invoice.deleteMany({});

      // 6. Delete all clients
      const clientsDeleted = await tx.client.deleteMany({});

      // 7. Before deleting non-admin users, update any user references
      // Find all non-admin user IDs first
      const nonAdminUsers = await tx.user.findMany({
        where: {
          role: {
            not: "ADMIN",
          },
        },
        select: { id: true },
      });
      const nonAdminUserIds = nonAdminUsers.map((u) => u.id);

      // Set createdById and updatedById to null for any users (including admin users)
      // that were created/updated by non-admin users
      if (nonAdminUserIds.length > 0) {
        await tx.user.updateMany({
          where: {
            OR: [
              {
                createdById: {
                  in: nonAdminUserIds,
                },
              },
              {
                updatedById: {
                  in: nonAdminUserIds,
                },
              },
            ],
          },
          data: {
            createdById: null,
            updatedById: null,
          },
        });
      }

      // 8. Delete all non-admin users (keep only ADMIN role users)
      const usersDeleted = await tx.user.deleteMany({
        where: {
          role: {
            not: "ADMIN",
          },
        },
      });

      // 9. Reset all sequences to 0 to start fresh
      await tx.sequence.updateMany({
        data: { value: 0 },
      });

      return {
        logsDeleted: logsDeleted.count,
        labourCostsDeleted: labourCostsDeleted.count,
        paymentsDeleted: paymentsDeleted.count,
        invoiceItemsDeleted: invoiceItemsDeleted.count,
        invoicesDeleted: invoicesDeleted.count,
        clientsDeleted: clientsDeleted.count,
        usersDeleted: usersDeleted.count,
      };
    });

    return NextResponse.json({
      success: true,
      message: "All data deleted successfully. Admin users have been preserved.",
      ...result,
    });
  } catch (error) {
    console.error("Error deleting all data:", error);
    return NextResponse.json(
      { 
        error: "Failed to delete all data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
