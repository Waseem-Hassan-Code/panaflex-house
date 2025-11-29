import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus } from "@prisma/client";
import { getPhoneSearchVariants } from "@/lib/phoneUtils";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "0");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";

    // Build where clause for clients with pending amounts
    const whereClause: any = {
      invoices: {
        some: {
          status: {
            in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL],
          },
        },
      },
    };

    // Add search filter if provided with smart phone search
    if (search) {
      const phoneVariants = getPhoneSearchVariants(search);
      whereClause.AND = [
        {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { clientId: { contains: search, mode: "insensitive" } },
            // Add all phone format variants
            ...phoneVariants.map((variant) => ({
              phone: { contains: variant, mode: "insensitive" as const },
            })),
          ],
        },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.client.count({
      where: whereClause,
    });

    // Get clients with pending invoices
    const clients = await prisma.client.findMany({
      where: whereClause,
      include: {
        invoices: {
          where: {
            status: {
              in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL],
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      skip: page * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format response with pending amount calculations
    const formattedClients = clients.map((client) => {
      const pendingInvoices = client.invoices;
      const totalPending = pendingInvoices.reduce(
        (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
        0
      );

      // Get oldest unpaid invoice for "days overdue" calculation
      const oldestInvoice = pendingInvoices[0];
      const daysOverdue = oldestInvoice
        ? Math.floor(
            (new Date().getTime() -
              new Date(oldestInvoice.createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;

      return {
        id: client.id,
        clientId: client.clientId,
        name: client.name,
        phone: client.phone,
        email: client.email,
        pendingInvoiceCount: pendingInvoices.length,
        totalPending,
        daysOverdue,
        oldestInvoiceDate: oldestInvoice?.createdAt || null,
      };
    });

    // Sort by pending amount (highest first)
    formattedClients.sort((a, b) => b.totalPending - a.totalPending);

    // Calculate total pending amount across all clients
    const allPendingInvoices = await prisma.invoice.findMany({
      where: {
        status: {
          in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIAL],
        },
      },
      select: {
        totalAmount: true,
        paidAmount: true,
      },
    });

    const grandTotalPending = allPendingInvoices.reduce(
      (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
      0
    );

    return NextResponse.json({
      success: true,
      data: formattedClients,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
      summary: {
        totalClientsWithPending: totalCount,
        grandTotalPending,
      },
    });
  } catch (error) {
    console.error("Error fetching pending amounts:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pending amounts" },
      { status: 500 }
    );
  }
}
