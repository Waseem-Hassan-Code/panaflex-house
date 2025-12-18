import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Get invoice history for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoices = await prisma.invoice.findMany({
      where: {
        clientId: id,
      },
      include: {
        items: {
          orderBy: { sNo: "asc" },
        },
        paymentsReceived: {
          orderBy: { paymentDate: "desc" },
        },
        labourCosts: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedInvoices = invoices.map((invoice) => {
      // Calculate itemsSubtotal from items
      const itemsSubtotal = invoice.items.reduce(
        (sum, item) => sum + item.amount,
        0
      );
      // Calculate total labour cost
      const labourCost = invoice.labourCosts.reduce(
        (sum, lc) => sum + lc.amount,
        0
      );

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        itemsSubtotal,
        labourCost,
        discount: invoice.discount || 0, // Include discount applied
        subtotal: invoice.subtotal,
        previousBalance: invoice.previousBalance,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        balanceDue: invoice.balanceDue,
        status: invoice.status,
        createdAt: invoice.createdAt,
        items: invoice.items.map((item) => ({
          sNo: item.sNo,
          itemName: item.itemName,
          width: item.width,
          height: item.height,
          quantity: item.quantity,
          sqf: item.sqf,
          rate: item.rate,
          amount: item.amount,
        })),
        paymentsReceived: invoice.paymentsReceived.map((payment) => ({
          id: payment.id,
          receiptNumber: payment.receiptNumber,
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          paymentMethod: payment.paymentMethod,
        })),
      };
    });

    return NextResponse.json({
      invoices: formattedInvoices,
    });
  } catch (error) {
    console.error("Error fetching invoice history:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice history" },
      { status: 500 }
    );
  }
}
