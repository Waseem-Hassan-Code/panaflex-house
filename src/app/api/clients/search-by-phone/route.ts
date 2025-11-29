import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPhoneSearchVariants } from "@/lib/phoneUtils";

// Search client by phone number
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Get all phone format variants for searching
    const phoneVariants = getPhoneSearchVariants(phone);

    // Search for client with any phone format variant
    const client = await prisma.client.findFirst({
      where: {
        OR: phoneVariants.map((variant) => ({
          phone: { contains: variant, mode: "insensitive" as const },
        })),
        isActive: true,
      },
      include: {
        invoices: {
          where: {
            status: { in: ["UNPAID", "PARTIAL"] },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!client) {
      return NextResponse.json({ found: false });
    }

    // Calculate pending balance
    const allUnpaidInvoices = await prisma.invoice.findMany({
      where: {
        clientId: client.id,
        status: { in: ["UNPAID", "PARTIAL"] },
      },
    });

    const pendingBalance = allUnpaidInvoices.reduce(
      (sum, inv) => sum + inv.balanceDue,
      0
    );

    const lastInvoice = client.invoices[0];

    return NextResponse.json({
      found: true,
      client: {
        id: client.id,
        clientId: client.clientId,
        name: client.name,
        phone: client.phone,
        email: client.email,
        address: client.address,
        pendingBalance,
        lastInvoice: lastInvoice
          ? {
              id: lastInvoice.id,
              invoiceNumber: lastInvoice.invoiceNumber,
              totalAmount: lastInvoice.totalAmount,
              balanceDue: lastInvoice.balanceDue,
              createdAt: lastInvoice.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error searching client:", error);
    return NextResponse.json(
      { error: "Failed to search client" },
      { status: 500 }
    );
  }
}
