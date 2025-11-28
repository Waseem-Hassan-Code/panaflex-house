import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@panaflex.com" },
    update: {},
    create: {
      email: "admin@panaflex.com",
      name: "Admin User",
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
      isSeeded: true,
    },
  });

  console.log("✅ Created admin user:", adminUser.email);

  // Initialize sequences
  const sequences = ["CLIENT", "INVOICE", "RECEIPT"];
  for (const seq of sequences) {
    await prisma.sequence.upsert({
      where: { id: seq },
      update: {},
      create: {
        id: seq,
        value: 0,
      },
    });
  }

  console.log("✅ Initialized sequences");

  console.log("🎉 Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
