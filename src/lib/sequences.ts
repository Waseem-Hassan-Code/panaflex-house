import { prisma } from "./prisma";

export type SequenceType = "CLIENT" | "INVOICE" | "RECEIPT" | "VOUCHER";

const PREFIXES: Record<SequenceType, string> = {
  CLIENT: "CLIENT_",
  INVOICE: "INV_",
  RECEIPT: "REC_",
  VOUCHER: "V_",
};

export async function getNextSequence(type: SequenceType): Promise<string> {
  const sequence = await prisma.sequence.upsert({
    where: { id: type },
    update: { value: { increment: 1 } },
    create: { id: type, value: 1 },
  });

  const paddedValue = String(sequence.value).padStart(3, "0");
  return `${PREFIXES[type]}${paddedValue}`;
}

export async function initializeSequences() {
  const types: SequenceType[] = ["CLIENT", "INVOICE", "RECEIPT", "VOUCHER"];

  for (const type of types) {
    await prisma.sequence.upsert({
      where: { id: type },
      update: {},
      create: { id: type, value: 0 },
    });
  }
}
