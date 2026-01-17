import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextSequence } from "@/lib/sequences";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - List payments received with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const clientId = searchParams.get("clientId");
    const invoiceId = searchParams.get("invoiceId");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * pageSize;

    interface WhereClause {
      clientId?: string;
      invoiceId?: string;
      OR?: Array<{
        receiptNumber?: { contains: string };
        client?: {
          name?: { contains: string };
          clientId?: { contains: string };
        };
        invoice?: { invoiceNumber?: { contains: string } };
      }>;
    }

    const where: WhereClause = {};

    if (clientId) {
      where.clientId = clientId;
    }

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    if (search) {
      where.OR = [
        { receiptNumber: { contains: search } },
        { client: { name: { contains: search } } },
        { client: { clientId: { contains: search } } },
        { invoice: { invoiceNumber: { contains: search } } },
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.paymentReceived.findMany({
        where,
        include: {
          client: {
            select: { id: true, clientId: true, name: true, phone: true },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              balanceDue: true,
            },
          },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
      }),
      prisma.paymentReceived.count({ where }),
    ]);

    return NextResponse.json({
      data: payments,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST - Receive payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, invoiceId, amount, paymentMethod, reference, notes } =
      body;

    if (!clientId || !invoiceId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Client ID, Invoice ID and valid amount are required" },
        { status: 400 }
      );
    }

    // Get the invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        invoiceNumber: true,
        clientId: true,
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        subtotal: true,
        discount: true,
        totalAmount: true,
        paidAmount: true,
        balanceDue: true,
        status: true,
        previousBalance: true,
        previousInvoiceId: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.clientId !== clientId) {
      return NextResponse.json(
        { error: "Invoice does not belong to this client" },
        { status: 400 }
      );
    }

    if (invoice.status === "PAID") {
      return NextResponse.json(
        { error: "Invoice is already fully paid" },
        { status: 400 }
      );
    }

    if (invoice.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot receive payment for cancelled invoice" },
        { status: 400 }
      );
    }

    // Calculate overpayment (extra amount beyond invoice balance)
    const overpayment = Math.max(0, amount - invoice.balanceDue);
    const actualPaymentForInvoice = amount - overpayment;

    // Generate receipt number
    const receiptNumber = await getNextSequence("RECEIPT");

    // Create payment within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.paymentReceived.create({
        data: {
          receiptNumber,
          clientId,
          invoiceId,
          amount,
          paymentMethod: paymentMethod || "CASH",
          reference,
          notes:
            overpayment > 0
              ? `${
                  notes || ""
                } [Overpayment of Rs. ${overpayment} added to credit balance]`.trim()
              : notes,
          createdById: session.user.id,
        },
        include: {
          client: {
            select: {
              id: true,
              clientId: true,
              name: true,
              creditBalance: true,
            },
          },
          invoice: { select: { id: true, invoiceNumber: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      // Update invoice
      // Recalculate balanceDue accounting for discount
      // IMPORTANT: Labour cost does NOT affect balance - it's just informational
      // Only discount should be subtracted from the balance
      // Formula: effectiveTotal = (subtotal + previousBalance) - discount
      // Then: balanceDue = effectiveTotal - paidAmount
      const newPaidAmount = invoice.paidAmount + actualPaymentForInvoice;
      const discountAmount = invoice.discount || 0;
      
      // Calculate effective total by subtracting discount only
      // Note: subtotal should already be items total (labour cost not subtracted)
      // If labour cost was incorrectly subtracted, we need to add it back
      // But for now, we'll assume subtotal is correct and just subtract discount
      const baseTotal = invoice.subtotal + invoice.previousBalance;
      const effectiveTotal = baseTotal - discountAmount;
      
      // Calculate balance due with discount applied
      const newBalanceDue = effectiveTotal - newPaidAmount;
      const newStatus = newBalanceDue <= 0 ? "PAID" : "PARTIAL";
      
      // Update totalAmount to reflect the discount if it wasn't already applied
      const correctedTotalAmount = effectiveTotal;

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          totalAmount: correctedTotalAmount, // Update totalAmount to account for discount
          paidAmount: newPaidAmount,
          balanceDue: Math.max(0, newBalanceDue),
          status: newStatus,
          updatedById: session.user.id,
        },
      });

      // If invoice is now fully paid, handle cascading updates
      if (newStatus === "PAID") {
        // 1. Mark all previous invoices (whose balance was carried forward) as paid from future invoice
        if (invoice.previousBalance > 0) {
          // Find all previous invoices by following the previousInvoiceId chain backwards
          const previousInvoices: string[] = [];
          let currentInvoiceId: string | null = invoiceId;
          
          while (currentInvoiceId) {
            const currentInv = await tx.invoice.findUnique({
              where: { id: currentInvoiceId },
              select: { previousInvoiceId: true },
            });
            
            if (currentInv?.previousInvoiceId) {
              previousInvoices.push(currentInv.previousInvoiceId);
              currentInvoiceId = currentInv.previousInvoiceId;
            } else {
              break;
            }
          }
          
          // Mark all previous invoices as having their balance paid from future invoice
          if (previousInvoices.length > 0) {
            try {
              await tx.invoice.updateMany({
                where: {
                  id: { in: previousInvoices },
                },
                data: {
                  balancePaidFromFutureInvoice: true,
                },
              });
            } catch (fieldError) {
              // If balancePaidFromFutureInvoice field doesn't exist yet, log but don't fail
              console.warn(
                "Could not update balancePaidFromFutureInvoice field:",
                fieldError
              );
            }
          }
        }

        // 2. Update all subsequent invoices that included this invoice's balance
        // Find all invoices that have this invoice as their previousInvoice
        const subsequentInvoices = await tx.invoice.findMany({
          where: {
            previousInvoiceId: invoiceId,
            status: { not: "CANCELLED" },
          },
          select: {
            id: true,
            previousBalance: true,
            subtotal: true,
            totalAmount: true,
            paidAmount: true,
            balanceDue: true,
          },
        });

        // For each subsequent invoice, reduce previousBalance by the amount that was carried forward from this invoice
        // Since this invoice was the previousInvoice, the subsequent invoice's previousBalance
        // includes this invoice's balanceDue at the time the subsequent invoice was created
        // We reduce by the original balanceDue that was carried forward (which equals this invoice's balanceDue before payment)
        const originalBalanceDue = invoice.balanceDue + actualPaymentForInvoice;
        
        for (const subsequentInv of subsequentInvoices) {
          // The amount to reduce is the minimum of:
          // - The subsequent invoice's previousBalance (can't reduce more than what's there)
          // - The original balanceDue from this invoice (the amount that was carried forward)
          const amountToReduce = Math.min(
            subsequentInv.previousBalance,
            originalBalanceDue
          );

          if (amountToReduce > 0) {
            const newPreviousBalance = Math.max(
              0,
              subsequentInv.previousBalance - amountToReduce
            );
            const newTotalAmount =
              subsequentInv.subtotal + newPreviousBalance;
            const newBalanceDue = Math.max(
              0,
              newTotalAmount - subsequentInv.paidAmount
            );
            const newSubsequentStatus =
              newBalanceDue <= 0 ? "PAID" : newBalanceDue < newTotalAmount ? "PARTIAL" : "UNPAID";

            await tx.invoice.update({
              where: { id: subsequentInv.id },
              data: {
                previousBalance: newPreviousBalance,
                totalAmount: newTotalAmount,
                balanceDue: newBalanceDue,
                status: newSubsequentStatus,
                updatedById: session.user.id,
              },
            });
          }
        }
      }

      // If there's overpayment, add to client's credit balance
      if (overpayment > 0) {
        const client = await tx.client.findUnique({
          where: { id: clientId },
          select: { creditBalance: true },
        });

        await tx.client.update({
          where: { id: clientId },
          data: {
            creditBalance: (client?.creditBalance || 0) + overpayment,
            updatedById: session.user.id,
          },
        });
      }

      // Create transaction log
      await tx.transactionLog.create({
        data: {
          entityType: "PAYMENT",
          entityId: payment.id,
          action: "PAYMENT_RECEIVED",
          userId: session.user.id,
          details: {
            receiptNumber: payment.receiptNumber,
            invoiceNumber: invoice.invoiceNumber,
            clientName: invoice.client.name,
            amount: payment.amount,
            appliedToInvoice: actualPaymentForInvoice,
            overpayment: overpayment,
            paymentMethod: payment.paymentMethod,
            newInvoiceStatus: newStatus,
            remainingBalance: Math.max(0, newBalanceDue),
          },
        },
      });

      return {
        ...payment,
        overpayment,
        appliedToInvoice: actualPaymentForInvoice,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error receiving payment:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to receive payment";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
