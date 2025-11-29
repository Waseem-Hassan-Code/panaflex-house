import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextSequence } from "@/lib/sequences";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { EntityType, ActionType } from "@prisma/client";

interface InvoiceItemInput {
  itemName: string;
  width: number;
  height: number;
  quantity: number;
  rate: number;
}

interface LabourCostInput {
  description: string;
  amount: number;
}

// POST - Create instant invoice (with auto client creation if needed)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      phone,
      clientId: existingClientId,
      items,
      labourCosts,
      notes,
    } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    let client;
    let isNewClient = false;

    // Check if client exists or needs to be created
    if (existingClientId) {
      // Use existing client
      client = await prisma.client.findUnique({
        where: { id: existingClientId },
        include: {
          invoices: {
            where: { status: { in: ["UNPAID", "PARTIAL"] } },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!client) {
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 }
        );
      }
    } else {
      // Create new client
      const clientNumber = await getNextSequence("CLIENT");

      client = await prisma.client.create({
        data: {
          clientId: clientNumber,
          name: name.trim(),
          phone: phone.trim(),
          createdById: session.user.id,
        },
        include: {
          invoices: {
            where: { status: { in: ["UNPAID", "PARTIAL"] } },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      isNewClient = true;

      // Log client creation
      await prisma.transactionLog.create({
        data: {
          entityType: EntityType.CLIENT,
          entityId: client.id,
          action: ActionType.CREATE,
          details: {
            clientId: client.clientId,
            name: client.name,
            phone: client.phone,
            source: "instant-invoice",
          },
          userId: session.user.id,
        },
      });
    }

    // Calculate previous balance from unpaid invoices
    const previousBalance = client.invoices.reduce(
      (sum, inv) => sum + inv.balanceDue,
      0
    );

    // Get the last unpaid invoice for reference
    const previousInvoice = client.invoices[0] || null;

    // Generate invoice number
    const invoiceNumber = await getNextSequence("INVOICE");

    // Process items
    const processedItems = items.map(
      (item: InvoiceItemInput, index: number) => {
        const sqf = item.width * item.height * item.quantity;
        const amount = sqf * item.rate;
        return {
          sNo: index + 1,
          itemName: item.itemName,
          width: item.width,
          height: item.height,
          quantity: item.quantity,
          sqf,
          rate: item.rate,
          amount,
        };
      }
    );

    const subtotal = processedItems.reduce(
      (sum: number, item: { amount: number }) => sum + item.amount,
      0
    );
    const totalAmount = subtotal + previousBalance;

    // Create invoice with items
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: client.id,
        subtotal,
        previousBalance,
        totalAmount,
        balanceDue: totalAmount,
        notes,
        previousInvoiceId: previousInvoice?.id || null,
        createdById: session.user.id,
        items: {
          create: processedItems,
        },
      },
      include: {
        client: true,
        items: true,
      },
    });

    // Create labour costs separately if any
    let createdLabourCosts: { description: string; amount: number }[] = [];
    if (labourCosts && labourCosts.length > 0) {
      const validLabourCosts = labourCosts.filter(
        (l: LabourCostInput) => l.description && l.amount > 0
      );
      if (validLabourCosts.length > 0) {
        // Create labour costs using Prisma client
        for (const labour of validLabourCosts) {
          try {
            await prisma.labourCost.create({
              data: {
                invoiceId: invoice.id,
                description: labour.description,
                amount: labour.amount,
              },
            });
            createdLabourCosts.push({
              description: labour.description,
              amount: labour.amount,
            });
          } catch (labourError) {
            console.error("Error creating labour cost:", labourError);
            // Continue with invoice creation even if labour cost fails
          }
        }
      }
    }

    // Log invoice creation
    await prisma.transactionLog.create({
      data: {
        entityType: EntityType.INVOICE,
        entityId: invoice.id,
        action: ActionType.CREATE,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          clientId: client.clientId,
          clientName: client.name,
          subtotal,
          previousBalance,
          totalAmount,
          itemCount: items.length,
          labourCostCount: labourCosts?.length || 0,
          source: "instant-invoice",
          isNewClient,
        },
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientId: client.clientId,
      clientName: client.name,
      subtotal,
      previousBalance,
      totalAmount,
      balanceDue: invoice.balanceDue,
      isNewClient,
      items: invoice.items,
      labourCosts: createdLabourCosts,
    });
  } catch (error) {
    console.error("Error creating instant invoice:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
