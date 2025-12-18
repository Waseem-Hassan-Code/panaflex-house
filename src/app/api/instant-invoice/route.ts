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
      discount,
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
      let client: {
        id: string;
        clientId: string;
        name: string;
        phone: string;
        creditBalance: number;
        hasMembership: boolean;
        membershipDiscount: number;
        membershipType: string | null;
        membershipEndDate: Date | null;
        invoices: { id: string; balanceDue: number }[];
      };
      let isNewClient = false;

      // Check if client exists or needs to be created
      if (existingClientId) {
        const existingClient = await tx.client.findUnique({
          where: { id: existingClientId },
          include: {
            invoices: {
              where: { status: { in: ["UNPAID", "PARTIAL"] } },
              orderBy: { createdAt: "desc" },
            },
          },
        });

        if (!existingClient) {
          throw new Error("Client not found");
        }

        client = {
          id: existingClient.id,
          clientId: existingClient.clientId,
          name: existingClient.name,
          phone: existingClient.phone,
          creditBalance:
            (existingClient as { creditBalance?: number }).creditBalance || 0,
          hasMembership:
            (existingClient as { hasMembership?: boolean }).hasMembership ||
            false,
          membershipDiscount:
            (existingClient as { membershipDiscount?: number })
              .membershipDiscount || 0,
          membershipType:
            (existingClient as { membershipType?: string | null })
              .membershipType || null,
          membershipEndDate:
            (existingClient as { membershipEndDate?: Date | null })
              .membershipEndDate || null,
          invoices: existingClient.invoices,
        };
      } else {
        // Create new client
        const clientNumber = await getNextSequence("CLIENT");

        const newClient = await tx.client.create({
          data: {
            clientId: clientNumber,
            name: name.trim(),
            phone: phone.trim(),
            createdById: session.user.id,
          },
        });

        client = {
          id: newClient.id,
          clientId: newClient.clientId,
          name: newClient.name,
          phone: newClient.phone,
          creditBalance: 0,
          hasMembership: false,
          membershipDiscount: 0,
          membershipType: null,
          membershipEndDate: null,
          invoices: [],
        };

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

      // Get client's credit balance (overpayment from previous invoices)
      const clientCreditBalance = client.creditBalance || 0;

      // Check membership validity
      const isMembershipValid =
        client.hasMembership &&
        (!client.membershipEndDate ||
          new Date(client.membershipEndDate) >= new Date());

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
      const subtotalAfterLabour = itemsSubtotal - totalLabourCost;

      // Apply manual discount if provided
      let manualDiscountAmount = 0;
      if (discount && discount.value > 0) {
        if (discount.type === "percentage") {
          manualDiscountAmount = Math.round(
            (subtotalAfterLabour * discount.value) / 100
          );
        } else {
          manualDiscountAmount = Math.min(discount.value, subtotalAfterLabour);
        }
      }

      const subtotalBeforeDiscount = subtotalAfterLabour - manualDiscountAmount;

      // Apply membership discount if valid
      let membershipDiscount = 0;
      if (isMembershipValid && client.membershipDiscount > 0) {
        if (client.membershipType === "PERCENTAGE") {
          membershipDiscount = Math.round(
            (subtotalBeforeDiscount * client.membershipDiscount) / 100
          );
        } else {
          // FIXED discount
          membershipDiscount = Math.min(
            client.membershipDiscount,
            subtotalBeforeDiscount
          );
        }
      }

      const subtotal = subtotalBeforeDiscount - membershipDiscount;

      // Apply credit balance adjustment
      const creditUsed = Math.min(
        clientCreditBalance,
        subtotal + previousBalance
      );
      const totalAmount = subtotal + previousBalance - creditUsed;

      // Build notes with discount info
      let invoiceNotes = notes || "";
      if (manualDiscountAmount > 0) {
        const discountInfo =
          discount.type === "percentage"
            ? `${discount.value}%`
            : `Rs. ${discount.value}`;
        invoiceNotes =
          `${invoiceNotes} [Discount: ${discountInfo} = Rs. ${manualDiscountAmount}]`.trim();
      }
      if (membershipDiscount > 0) {
        const discountType =
          client.membershipType === "PERCENTAGE"
            ? `${client.membershipDiscount}%`
            : `Rs. ${client.membershipDiscount}`;
        invoiceNotes =
          `${invoiceNotes} [Member Discount: ${discountType} = Rs. ${membershipDiscount}]`.trim();
      }
      if (creditUsed > 0) {
        invoiceNotes =
          `${invoiceNotes} [Credit Balance of Rs. ${creditUsed} applied]`.trim();
      }

      // Create invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          clientId: client.id,
          subtotal,
          discount: manualDiscountAmount + membershipDiscount, // Store total discount applied
          previousBalance,
          totalAmount: subtotal + previousBalance,
          balanceDue: totalAmount,
          paidAmount: creditUsed,
          status: totalAmount <= 0 ? "PAID" : "UNPAID",
          notes: invoiceNotes || null,
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

      // If credit was used, update client's credit balance
      if (creditUsed > 0) {
        await tx.client.update({
          where: { id: client.id },
          data: {
            updatedById: session.user.id,
          } as Record<string, unknown>,
        });
        // Note: creditBalance field will work after running: npx prisma generate
      }

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
      let finalPaidAmount = creditUsed; // Start with credit used
      let overpaymentToCredit = 0;

      if (payment && payment.amount > 0 && totalAmount > 0) {
        // Calculate if payment exceeds balance due
        overpaymentToCredit = Math.max(0, payment.amount - totalAmount);
        const paymentAmount = payment.amount;
        const appliedToInvoice = paymentAmount - overpaymentToCredit;

        const receiptNumber = await getNextSequence("RECEIPT");

        paymentReceived = await tx.paymentReceived.create({
          data: {
            receiptNumber,
            invoiceId: invoice.id,
            clientId: client.id,
            amount: paymentAmount,
            paymentMethod: payment.paymentMethod || "CASH",
            paymentDate: new Date(),
            notes:
              overpaymentToCredit > 0
                ? `Payment at invoice creation [Rs. ${overpaymentToCredit} added to credit balance]`
                : "Payment received at invoice creation",
            createdById: session.user.id,
          },
        });

        finalBalanceDue = Math.max(0, totalAmount - appliedToInvoice);
        finalPaidAmount = creditUsed + appliedToInvoice;
        const newStatus = finalBalanceDue <= 0 ? "PAID" : "PARTIAL";

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: finalPaidAmount,
            balanceDue: finalBalanceDue,
            status: newStatus,
          },
        });

        // If there's overpayment, add to client's credit balance
        if (overpaymentToCredit > 0) {
          await tx.client.update({
            where: { id: client.id },
            data: {
              updatedById: session.user.id,
            } as Record<string, unknown>,
          });
          // Note: creditBalance field will work after running: npx prisma generate
        }

        await tx.transactionLog.create({
          data: {
            entityType: EntityType.PAYMENT,
            entityId: paymentReceived.id,
            action: ActionType.CREATE,
            details: {
              receiptNumber,
              invoiceNumber: invoice.invoiceNumber,
              amount: paymentAmount,
              appliedToInvoice,
              overpaymentToCredit,
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
            manualDiscount: manualDiscountAmount,
            manualDiscountType: discount?.type || null,
            manualDiscountValue: discount?.value || null,
            membershipDiscount,
            membershipType: client.membershipType,
            subtotal,
            previousBalance,
            creditUsed,
            totalAmount: subtotal + previousBalance,
            paidAmount: finalPaidAmount,
            balanceDue: finalBalanceDue,
            itemCount: items.length,
            labourCostCount: validLabourCosts.length,
            source: "instant-invoice",
            isNewClient,
            hasMembership: isMembershipValid,
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
        manualDiscount: manualDiscountAmount,
        manualDiscountType: discount?.type || null,
        manualDiscountValue: discount?.value || null,
        membershipDiscount,
        membershipType: client.membershipType,
        subtotal,
        previousBalance,
        creditUsed,
        totalAmount: subtotal + previousBalance,
        paidAmount: finalPaidAmount,
        balanceDue: finalBalanceDue,
        isNewClient,
        hasMembership: isMembershipValid,
        items: invoice.items,
        labourCosts: createdLabourCosts,
        payment: paymentReceived
          ? {
              receiptNumber: paymentReceived.receiptNumber,
              amount: paymentReceived.amount,
              paymentMethod: paymentReceived.paymentMethod,
              overpaymentToCredit,
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
