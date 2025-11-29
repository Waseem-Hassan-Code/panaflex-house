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
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedInvoices = invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
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
    }));

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
