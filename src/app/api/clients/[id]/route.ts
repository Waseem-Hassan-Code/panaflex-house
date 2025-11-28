import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Get single client with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        invoices: {
          include: {
            items: true,
            paymentsReceived: true,
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        paymentsReceived: {
          include: {
            invoice: { select: { id: true, invoiceNumber: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Calculate total balance
    const totalBalance = client.invoices.reduce(
      (sum, inv) => sum + inv.balanceDue,
      0
    );

    return NextResponse.json({ ...client, totalBalance });
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

// PUT - Update client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, address, cnic, isActive } = body;

    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address,
        cnic,
        isActive,
        updatedById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Create transaction log
    await prisma.transactionLog.create({
      data: {
        entityType: "CLIENT",
        entityId: client.id,
        action: "UPDATE",
        userId: session.user.id,
        details: JSON.stringify({
          before: {
            name: existingClient.name,
            phone: existingClient.phone,
            email: existingClient.email,
          },
          after: {
            name: client.name,
            phone: client.phone,
            email: client.email,
          },
        }),
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const client = await prisma.client.update({
      where: { id },
      data: {
        isActive: false,
        updatedById: session.user.id,
      },
    });

    await prisma.transactionLog.create({
      data: {
        entityType: "CLIENT",
        entityId: id,
        action: "DEACTIVATE",
        userId: session.user.id,
        details: JSON.stringify({
          clientId: client.clientId,
          name: client.name,
        }),
      },
    });

    return NextResponse.json({ message: "Client deactivated" });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
