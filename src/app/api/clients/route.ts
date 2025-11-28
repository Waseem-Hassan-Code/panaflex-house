import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextSequence } from "@/lib/sequences";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - List clients with pagination and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * pageSize;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { clientId: { contains: search } },
            { email: { contains: search } },
            { cnic: { contains: search } },
          ],
        }
      : {};

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          updatedBy: { select: { id: true, name: true, email: true } },
          invoices: {
            select: {
              id: true,
              balanceDue: true,
              status: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
      }),
      prisma.client.count({ where }),
    ]);

    // Calculate total balance for each client
    const clientsWithBalance = clients.map((client) => {
      const totalBalance = client.invoices.reduce(
        (sum, inv) => sum + inv.balanceDue,
        0
      );
      return {
        ...client,
        totalBalance,
      };
    });

    return NextResponse.json({
      data: clientsWithBalance,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

// POST - Create new client
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, address, cnic } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    // Generate auto client ID
    const clientId = await getNextSequence("CLIENT");

    const client = await prisma.client.create({
      data: {
        clientId,
        name,
        email,
        phone,
        address,
        cnic,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Create transaction log
    await prisma.transactionLog.create({
      data: {
        entityType: "CLIENT",
        entityId: client.id,
        action: "CREATE",
        userId: session.user.id,
        details: JSON.stringify({
          clientId: client.clientId,
          name: client.name,
          phone: client.phone,
        }),
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
