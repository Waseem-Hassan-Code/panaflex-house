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

    if (!clientId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Client ID and valid amount are required" },
        { status: 400 }
      );
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        creditBalance: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // If invoiceId is provided, validate it (optional - for backward compatibility)
    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { clientId: true, status: true },
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

      if (invoice.status === "CANCELLED") {
        return NextResponse.json(
          { error: "Cannot receive payment for cancelled invoice" },
          { status: 400 }
        );
      }
    }

    // Generate receipt number
    const receiptNumber = await getNextSequence("RECEIPT");

    // Create payment within transaction
    const result = await prisma.$transaction(async (tx) => {
      // FIFO Payment Allocation Logic
      // 1. Get all unpaid invoices for this client, sorted by invoiceDate (oldest first)
      const unpaidInvoices = await tx.invoice.findMany({
        where: {
          clientId,
          status: { not: "CANCELLED" },
          balanceDue: { gt: 0 },
          balancePaidFromFutureInvoice: { not: true }, // Exclude invoices already paid from future invoices
        },
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          subtotal: true,
          discount: true,
          previousBalance: true,
          totalAmount: true,
          paidAmount: true,
          balanceDue: true,
          status: true,
        },
        orderBy: {
          invoiceDate: "asc", // FIFO: oldest first
        },
      });

      if (unpaidInvoices.length === 0) {
        // No unpaid invoices - add entire payment to credit balance
        await tx.client.update({
          where: { id: clientId },
          data: {
            creditBalance: (client.creditBalance || 0) + amount,
            updatedById: session.user.id,
          },
        });

        // Create payment record (no invoiceId, no allocations)
        const payment = await tx.paymentReceived.create({
          data: {
            receiptNumber,
            clientId,
            invoiceId: null, // No specific invoice
            amount,
            paymentMethod: paymentMethod || "CASH",
            reference,
            notes: notes || "Payment received - no outstanding invoices",
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
            createdBy: { select: { id: true, name: true } },
          },
        });

        return {
          payment,
          allocations: [],
          totalAllocated: 0,
          creditAdded: amount,
        };
      }

      // 2. Allocate payment FIFO style
      let remainingPayment = amount;
      const allocations: Array<{
        invoiceId: string;
        invoiceNumber: string;
        amountApplied: number;
        previousBalance: number;
        newBalance: number;
        newStatus: string;
      }> = [];

      for (const invoice of unpaidInvoices) {
        if (remainingPayment <= 0) break;

        // Calculate effective total (subtotal + previousBalance - discount)
        const discountAmount = invoice.discount || 0;
        const baseTotal = invoice.subtotal + invoice.previousBalance;
        const effectiveTotal = baseTotal - discountAmount;
        const currentBalanceDue = effectiveTotal - invoice.paidAmount;

        if (currentBalanceDue <= 0) continue; // Skip if already paid

        // Amount to apply to this invoice
        const amountToApply = Math.min(remainingPayment, currentBalanceDue);

        // Update invoice
        const newPaidAmount = invoice.paidAmount + amountToApply;
        const newBalanceDue = Math.max(0, effectiveTotal - newPaidAmount);
        let newStatus: "PAID" | "PARTIAL" | "UNPAID";
        if (newBalanceDue <= 0) {
          newStatus = "PAID";
        } else if (newBalanceDue < effectiveTotal) {
          newStatus = "PARTIAL";
        } else {
          newStatus = "UNPAID";
        }

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            totalAmount: effectiveTotal,
            paidAmount: newPaidAmount,
            balanceDue: newBalanceDue,
            status: newStatus,
            updatedById: session.user.id,
          },
        });

        allocations.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amountApplied: amountToApply,
          previousBalance: currentBalanceDue,
          newBalance: newBalanceDue,
          newStatus,
        });

        remainingPayment -= amountToApply;
      }

      // 3. Create payment record
      const payment = await tx.paymentReceived.create({
        data: {
          receiptNumber,
          clientId,
          invoiceId: invoiceId || null, // Optional: primary invoice if specified
          amount,
          paymentMethod: paymentMethod || "CASH",
          reference,
          notes: notes || "",
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
          createdBy: { select: { id: true, name: true } },
        },
      });

      // 4. Create payment allocations
      const totalAllocated = allocations.reduce((sum, a) => sum + a.amountApplied, 0);
      for (const allocation of allocations) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            invoiceId: allocation.invoiceId,
            amountApplied: allocation.amountApplied,
          },
        });
      }

      // 5. Handle overpayment (add to credit balance)
      if (remainingPayment > 0) {
        await tx.client.update({
          where: { id: clientId },
          data: {
            creditBalance: (client.creditBalance || 0) + remainingPayment,
            updatedById: session.user.id,
          },
        });
      }

      // 6. Handle cascading updates for fully paid invoices
      for (const allocation of allocations) {
        if (allocation.newStatus === "PAID") {
          // Mark previous invoices as paid from future invoice
          const invoice = await tx.invoice.findUnique({
            where: { id: allocation.invoiceId },
            select: { previousBalance: true },
          });

          if (invoice && invoice.previousBalance > 0) {
            // Find invoices that had their balance carried forward to this invoice
            const carryForwardRecords = await tx.invoiceCarryForward.findMany({
              where: { nextInvoiceId: allocation.invoiceId },
              select: { previousInvoiceId: true },
            });

            if (carryForwardRecords.length > 0) {
              const previousInvoiceIds = carryForwardRecords.map(
                (r) => r.previousInvoiceId
              );
              await tx.invoice.updateMany({
                where: {
                  id: { in: previousInvoiceIds },
                },
                data: {
                  balancePaidFromFutureInvoice: true,
                },
              });
            }
          }

          // Update subsequent invoices that carried forward this invoice's balance
          const subsequentInvoices = await tx.invoice.findMany({
            where: {
              previousInvoiceId: allocation.invoiceId,
              status: { not: "CANCELLED" },
            },
            select: {
              id: true,
              previousBalance: true,
              subtotal: true,
              paidAmount: true,
            },
          });

          for (const subsequentInv of subsequentInvoices) {
            // Reduce previousBalance by the amount that was carried forward
            const originalBalance = allocation.previousBalance;
            const amountToReduce = Math.min(
              subsequentInv.previousBalance,
              originalBalance
            );

            if (amountToReduce > 0) {
              const newPreviousBalance = Math.max(
                0,
                subsequentInv.previousBalance - amountToReduce
              );
              const discountAmount = 0; // Get from invoice if needed
              const newTotalAmount = subsequentInv.subtotal + newPreviousBalance;
              const newBalanceDue = Math.max(
                0,
                newTotalAmount - subsequentInv.paidAmount
              );
              const newSubsequentStatus =
                newBalanceDue <= 0
                  ? "PAID"
                  : newBalanceDue < newTotalAmount
                  ? "PARTIAL"
                  : "UNPAID";

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
      }


      // 7. Create transaction log
      await tx.transactionLog.create({
        data: {
          entityType: "PAYMENT",
          entityId: payment.id,
          action: "PAYMENT_RECEIVED",
          userId: session.user.id,
          details: {
            receiptNumber: payment.receiptNumber,
            clientName: client.name,
            amount: payment.amount,
            totalAllocated: totalAllocated,
            creditAdded: remainingPayment,
            allocations: allocations.map((a) => ({
              invoiceNumber: a.invoiceNumber,
              amountApplied: a.amountApplied,
              newStatus: a.newStatus,
            })),
            paymentMethod: payment.paymentMethod,
          },
        },
      });

      return {
        payment,
        allocations,
        totalAllocated,
        creditAdded: remainingPayment,
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
