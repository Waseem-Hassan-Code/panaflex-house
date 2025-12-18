import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPhoneSearchVariants } from "@/lib/phoneUtils";

// Global search across clients, invoices, and payments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Get phone variants for smart phone search
    const phoneVariants = getPhoneSearchVariants(query);
    const phoneConditions = phoneVariants.map((variant) => ({
      phone: { contains: variant, mode: "insensitive" as const },
    }));

    // Search clients with smart phone search (case-insensitive)
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { clientId: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { cnic: { contains: query, mode: "insensitive" } },
          // Add all phone format variants
          ...phoneConditions,
        ],
        isActive: true,
      },
      select: {
        id: true,
        clientId: true,
        name: true,
        phone: true,
      },
      take: limit,
    });

    // Search invoices (case-insensitive)
    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNumber: { contains: query, mode: "insensitive" } },
          { client: { name: { contains: query, mode: "insensitive" } } },
          { client: { clientId: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        status: true,
        client: {
          select: { name: true, clientId: true },
        },
      },
      take: limit,
    });

    // Search payments (case-insensitive)
    const payments = await prisma.paymentReceived.findMany({
      where: {
        OR: [
          { receiptNumber: { contains: query, mode: "insensitive" } },
          { client: { name: { contains: query, mode: "insensitive" } } },
          {
            invoice: {
              invoiceNumber: { contains: query, mode: "insensitive" },
            },
          },
        ],
      },
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        client: {
          select: { name: true, clientId: true },
        },
        invoice: {
          select: { invoiceNumber: true },
        },
      },
      take: limit,
    });

    const results = [
      ...clients.map((c) => ({
        type: "client" as const,
        id: c.id,
        title: `${c.clientId} - ${c.name}`,
        subtitle: c.phone,
        url: `/clients/${c.id}`,
      })),
      ...invoices.map((i) => ({
        type: "invoice" as const,
        id: i.id,
        title: `${i.invoiceNumber} - ${i.client.name}`,
        subtitle: `Rs. ${i.totalAmount.toLocaleString()} (${i.status})`,
        url: `/invoices/${i.id}`,
      })),
      ...payments.map((p) => ({
        type: "payment" as const,
        id: p.id,
        title: `${p.receiptNumber} - ${p.client.name}`,
        subtitle: `Rs. ${p.amount.toLocaleString()} for ${
          p.invoice.invoiceNumber
        }`,
        url: `/payments/${p.id}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error in global search:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
