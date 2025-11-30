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
      payment,
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

    // Use a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      let client;
      let isNewClient = false;

      // Check if client exists or needs to be created
      if (existingClientId) {
        client = await tx.client.findUnique({
          where: { id: existingClientId },
          include: {
            invoices: {
              where: { status: { in: ["UNPAID", "PARTIAL"] } },
              orderBy: { createdAt: "desc" },
            },
          },
        });

        if (!client) {
          throw new Error("Client not found");
        }
      } else {
        // Create new client
        const clientNumber = await getNextSequence("CLIENT");

        client = await tx.client.create({
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
        await tx.transactionLog.create({
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

      const previousInvoice = client.invoices[0] || null;
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

      // Calculate items total
      const itemsSubtotal = processedItems.reduce(
        (sum: number, item: { amount: number }) => sum + item.amount,
        0
      );

      // Calculate total labour costs (to be subtracted from invoice total)
      const validLabourCosts = (labourCosts || []).filter(
        (l: LabourCostInput) => l.description && l.amount > 0
      );
      const totalLabourCost = validLabourCosts.reduce(
        (sum: number, l: LabourCostInput) => sum + l.amount,
        0
      );

      // Subtotal = Items total - Labour costs (labour is deducted)
      const subtotal = itemsSubtotal - totalLabourCost;
      const totalAmount = subtotal + previousBalance;

      // Create invoice
      const invoice = await tx.invoice.create({
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

      // Create labour costs records
      const createdLabourCosts: { description: string; amount: number }[] = [];
      for (const labour of validLabourCosts) {
        await tx.labourCost.create({
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
      }

      // Handle payment if provided
      let paymentReceived = null;
      let finalBalanceDue = totalAmount;
      let finalPaidAmount = 0;

      if (payment && payment.amount > 0 && totalAmount > 0) {
        const paymentAmount = Math.min(payment.amount, totalAmount);

        const receiptNumber = await getNextSequence("RECEIPT");

        paymentReceived = await tx.paymentReceived.create({
          data: {
            receiptNumber,
            invoiceId: invoice.id,
            clientId: client.id,
            amount: paymentAmount,
            paymentMethod: payment.paymentMethod || "CASH",
            paymentDate: new Date(),
            notes: "Payment received at invoice creation",
            createdById: session.user.id,
          },
        });

        finalBalanceDue = totalAmount - paymentAmount;
        finalPaidAmount = paymentAmount;
        const newStatus = finalBalanceDue <= 0 ? "PAID" : "PARTIAL";

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: paymentAmount,
            balanceDue: finalBalanceDue,
            status: newStatus,
          },
        });

        await tx.transactionLog.create({
          data: {
            entityType: EntityType.PAYMENT,
            entityId: paymentReceived.id,
            action: ActionType.CREATE,
            details: {
              receiptNumber,
              invoiceNumber: invoice.invoiceNumber,
              amount: paymentAmount,
              paymentMethod: payment.paymentMethod,
              source: "instant-invoice",
            },
            userId: session.user.id,
          },
        });
      }

      // Log invoice creation
      await tx.transactionLog.create({
        data: {
          entityType: EntityType.INVOICE,
          entityId: invoice.id,
          action: ActionType.CREATE,
          details: {
            invoiceNumber: invoice.invoiceNumber,
            clientId: client.clientId,
            clientName: client.name,
            itemsSubtotal,
            labourCost: totalLabourCost,
            subtotal,
            previousBalance,
            totalAmount,
            paidAmount: finalPaidAmount,
            balanceDue: finalBalanceDue,
            itemCount: items.length,
            labourCostCount: validLabourCosts.length,
            source: "instant-invoice",
            isNewClient,
          },
          userId: session.user.id,
        },
      });

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientId: client.clientId,
        clientName: client.name,
        itemsSubtotal,
        labourCost: totalLabourCost,
        subtotal,
        previousBalance,
        totalAmount,
        paidAmount: finalPaidAmount,
        balanceDue: finalBalanceDue,
        isNewClient,
        items: invoice.items,
        labourCosts: createdLabourCosts,
        payment: paymentReceived
          ? {
              receiptNumber: paymentReceived.receiptNumber,
              amount: paymentReceived.amount,
              paymentMethod: paymentReceived.paymentMethod,
            }
          : null,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating instant invoice:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
