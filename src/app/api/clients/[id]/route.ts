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
    const {
      name,
      email,
      phone,
      address,
      cnic,
      isActive,
      // Membership fields
      hasMembership,
      membershipDiscount,
      membershipType,
      membershipStartDate,
      membershipEndDate,
    } = body;

    const existingClient = await prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Build update data object
    const updateData: Record<string, unknown> = {
      updatedById: session.user.id,
    };

    // Only include fields that are provided
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (cnic !== undefined) updateData.cnic = cnic;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Membership fields
    if (hasMembership !== undefined) updateData.hasMembership = hasMembership;
    if (membershipDiscount !== undefined)
      updateData.membershipDiscount = membershipDiscount;
    if (membershipType !== undefined)
      updateData.membershipType = membershipType;
    if (membershipStartDate !== undefined)
      updateData.membershipStartDate = membershipStartDate
        ? new Date(membershipStartDate)
        : null;
    if (membershipEndDate !== undefined)
      updateData.membershipEndDate = membershipEndDate
        ? new Date(membershipEndDate)
        : null;

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
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
        details: {
          membershipChanged:
            hasMembership !== undefined &&
            hasMembership !== existingClient.hasMembership,
          membershipAction:
            hasMembership !== undefined &&
            hasMembership !== existingClient.hasMembership
              ? hasMembership
                ? "ADDED"
                : "REMOVED"
              : null,
          before: {
            name: existingClient.name,
            phone: existingClient.phone,
            email: existingClient.email,
            hasMembership: existingClient.hasMembership,
            membershipDiscount: existingClient.membershipDiscount,
            membershipType: existingClient.membershipType,
          },
          after: {
            name: client.name,
            phone: client.phone,
            email: client.email,
            hasMembership: client.hasMembership,
            membershipDiscount: client.membershipDiscount,
            membershipType: client.membershipType,
          },
        },
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
        details: {
          clientId: client.clientId,
          name: client.name,
        },
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
