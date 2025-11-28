import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { hasPermission, Permission } from "@/lib/permissions";

// Get all users (paginated) - excluding seeded accounts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_USERS)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const includeSeeded = searchParams.get("includeSeeded") === "true";

    const skip = (page - 1) * pageSize;

    interface WhereClause {
      isSeeded?: boolean;
      OR?: Array<{
        name?: { contains: string };
        email?: { contains: string };
      }>;
    }

    const where: WhereClause = {};

    // Exclude seeded accounts (admin) unless explicitly requested
    if (!includeSeeded) {
      where.isSeeded = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          phone: true,
          address: true,
          isActive: true,
          isSeeded: true,
          createdAt: true,
          updatedAt: true,
          createdByUser: { select: { id: true, name: true } },
          updatedByUser: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      data: users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Failed to get users" }, { status: 500 });
  }
}

// Create new user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.CREATE_USER)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, password, role, phone, address } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: role || "VIEWER",
        phone,
        address,
        createdById: session.user.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        address: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Create transaction log
    await prisma.transactionLog.create({
      data: {
        entityType: "USER",
        entityId: user.id,
        action: "CREATE",
        userId: session.user.id,
        details: {
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
