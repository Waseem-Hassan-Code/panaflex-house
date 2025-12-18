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

    // Get the most recent unpaid/partial invoice to get the actual pending balance
    // The latest invoice's balanceDue already includes any previous carried-forward balance
    const latestUnpaidInvoice = await prisma.invoice.findFirst({
      where: {
        clientId: client.id,
        status: { in: ["UNPAID", "PARTIAL"] },
      },
      orderBy: { createdAt: "desc" },
    });

    // The pending balance is the balanceDue of the latest unpaid invoice
    // since it already includes any carried-forward balance from previous invoices
    const pendingBalance = latestUnpaidInvoice?.balanceDue || 0;

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
        creditBalance:
          (client as { creditBalance?: number }).creditBalance || 0,
        hasMembership:
          (client as { hasMembership?: boolean }).hasMembership || false,
        membershipDiscount:
          (client as { membershipDiscount?: number }).membershipDiscount || 0,
        membershipType:
          (client as { membershipType?: string | null }).membershipType || null,
        membershipEndDate:
          (client as { membershipEndDate?: Date | null }).membershipEndDate ||
          null,
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
