import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNextSequence } from "@/lib/sequences";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { records } = await request.json();

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: "No records provided" },
        { status: 400 }
      );
    }

    const results = {
      imported: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each record
    for (const record of records) {
      try {
        const { name, phone, balance, date } = record;

        if (!name || name.trim().length === 0) {
          results.failed++;
          results.errors.push(`Skipped: Empty name`);
          continue;
        }

        // Normalize phone number
        const normalizedPhone = phone
          ? String(phone).replace(/[^0-9]/g, "")
          : "";
        const isVerified = normalizedPhone.length >= 10;

        // Check if client with same phone already exists (only if phone is valid)
        if (isVerified) {
          const existingClient = await prisma.client.findFirst({
            where: { phone: normalizedPhone },
          });

          if (existingClient) {
            // Client exists - create opening balance invoice if balance > 0
            if (balance && balance > 0) {
              const invoiceNumber = await getNextSequence("INVOICE");
              const invoiceDate = date ? new Date(date) : new Date();

              await prisma.invoice.create({
                data: {
                  invoiceNumber,
                  clientId: existingClient.id,
                  invoiceDate,
                  subtotal: balance,
                  totalAmount: balance,
                  balanceDue: balance,
                  status: "UNPAID",
                  notes: "Opening balance - Imported from Excel",
                  createdById: session.user.id,
                },
              });
            }

            results.imported++;
            continue;
          }
        }

        // Create new client
        const clientId = await getNextSequence("CLIENT");

        const client = await prisma.client.create({
          data: {
            clientId,
            name: name.trim(),
            phone:
              normalizedPhone ||
              `UNVERIFIED_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 7)}`,
            isVerified,
            isImported: true,
            createdById: session.user.id,
          },
        });

        // Create opening balance invoice if balance > 0
        if (balance && balance > 0) {
          const invoiceNumber = await getNextSequence("INVOICE");
          const invoiceDate = date ? new Date(date) : new Date();

          await prisma.invoice.create({
            data: {
              invoiceNumber,
              clientId: client.id,
              invoiceDate,
              subtotal: balance,
              totalAmount: balance,
              balanceDue: balance,
              status: "UNPAID",
              notes: "Opening balance - Imported from Excel",
              createdById: session.user.id,
            },
          });
        }

        results.imported++;
      } catch (err) {
        results.failed++;
        results.errors.push(
          `Failed to import "${record.name}": ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error in bulk import:", error);
    return NextResponse.json(
      { error: "Failed to import records" },
      { status: 500 }
    );
  }
}
