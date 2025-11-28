import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Last 30 days for trends
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const [
      paymentsToday,
      paymentsThisMonth,
      invoicesToday,
      invoicesThisMonth,
      pendingAmount,
      activeClients,
      recentInvoices,
      recentPayments,
      dailyPaymentsData,
      dailyInvoicesData,
    ] = await Promise.all([
      // Total payments received today
      prisma.paymentReceived.aggregate({
        where: {
          paymentDate: { gte: startOfDay },
        },
        _sum: { amount: true },
      }),
      // Total payments received this month
      prisma.paymentReceived.aggregate({
        where: {
          paymentDate: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      // Invoices created today
      prisma.invoice.count({
        where: {
          createdAt: { gte: startOfDay },
        },
      }),
      // Invoices created this month
      prisma.invoice.count({
        where: {
          createdAt: { gte: startOfMonth },
        },
      }),
      // Total pending amount (unpaid + partial)
      prisma.invoice.aggregate({
        where: {
          status: { in: ["UNPAID", "PARTIAL"] },
        },
        _sum: { balanceDue: true },
      }),
      // Active clients count
      prisma.client.count({
        where: { isActive: true },
      }),
      // Recent invoices
      prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { name: true, clientId: true } },
        },
      }),
      // Recent payments
      prisma.paymentReceived.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          client: { select: { name: true, clientId: true } },
          invoice: { select: { invoiceNumber: true } },
        },
      }),
      // Daily payments for last 30 days
      prisma.paymentReceived.groupBy({
        by: ["paymentDate"],
        where: {
          paymentDate: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
        orderBy: { paymentDate: "asc" },
      }),
      // Daily invoices for last 30 days
      prisma.invoice.groupBy({
        by: ["invoiceDate"],
        where: {
          invoiceDate: { gte: thirtyDaysAgo },
        },
        _count: true,
        _sum: { totalAmount: true },
        orderBy: { invoiceDate: "asc" },
      }),
    ]);

    // Format daily data
    const dailyPayments = dailyPaymentsData.map((item) => ({
      date: item.paymentDate.toISOString().split("T")[0],
      amount: item._sum.amount || 0,
    }));

    const dailyInvoices = dailyInvoicesData.map((item) => ({
      date: item.invoiceDate.toISOString().split("T")[0],
      count: item._count || 0,
      amount: item._sum.totalAmount || 0,
    }));

    return NextResponse.json({
      totalPaymentsToday: paymentsToday._sum.amount || 0,
      totalPaymentsThisMonth: paymentsThisMonth._sum.amount || 0,
      totalInvoicesToday: invoicesToday,
      totalInvoicesThisMonth: invoicesThisMonth,
      pendingAmount: pendingAmount._sum.balanceDue || 0,
      activeClients,
      recentInvoices,
      recentPayments,
      dailyPayments,
      dailyInvoices,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to get dashboard stats" },
      { status: 500 }
    );
  }
}
