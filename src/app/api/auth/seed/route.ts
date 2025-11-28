import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Seed initial admin user and sequences
async function seedAdmin() {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN", isSeeded: true },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { message: "Admin already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash("admin123", 12);

    const admin = await prisma.user.create({
      data: {
        email: "admin@panaflex.com",
        name: "Admin User",
        password: hashedPassword,
        role: "ADMIN",
        isSeeded: true,
      },
    });

    // Initialize sequences (upsert to avoid duplicates)
    const sequenceTypes = ["CLIENT", "INVOICE", "RECEIPT"];
    for (const type of sequenceTypes) {
      await prisma.sequence.upsert({
        where: { id: type },
        create: { id: type, value: 0 },
        update: {}, // No update needed
      });
    }

    return NextResponse.json({
      message: "Admin created successfully",
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed admin" },
      { status: 500 }
    );
  }
}

// Support both GET and POST
export async function GET() {
  return seedAdmin();
}

export async function POST() {
  return seedAdmin();
}
