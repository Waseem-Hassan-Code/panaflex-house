import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface PaymentData {
  id: string;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  invoiceId: string;
  invoice: {
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    client: {
      id: string;
      clientId: string;
      name: string;
      phone: string;
    };
  };
}

export async function GET() {
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all payments made today with client and invoice details
    const payments = (await prisma.paymentReceived.findMany({
      where: {
        paymentDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        invoice: {
          include: {
            client: true,
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    })) as PaymentData[];

    // Format the response with client details
    const formattedPayments = payments.map((payment: PaymentData) => ({
      id: payment.id,
      clientId: payment.invoice.client.id,
      clientName: payment.invoice.client.name,
      clientPhone: payment.invoice.client.phone,
      receiptNumber: payment.receiptNumber,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      invoiceId: payment.invoiceId,
      invoiceNumber: payment.invoice.invoiceNumber,
      invoiceTotal: payment.invoice.totalAmount,
      invoicePaid: payment.invoice.paidAmount,
      invoiceRemaining:
        payment.invoice.totalAmount - payment.invoice.paidAmount,
    }));

    // Calculate totals
    const totalAmount = payments.reduce(
      (sum: number, p: PaymentData) => sum + p.amount,
      0
    );
    const totalRemaining = formattedPayments.reduce(
      (sum: number, p: { invoiceRemaining: number }) =>
        sum + p.invoiceRemaining,
      0
    );

    return NextResponse.json({
      success: true,
      data: formattedPayments,
      summary: {
        totalPayments: payments.length,
        totalAmount,
        totalRemaining,
      },
    });
  } catch (error) {
    console.error("Error fetching today payments:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch today payments" },
      { status: 500 }
    );
  }
}
