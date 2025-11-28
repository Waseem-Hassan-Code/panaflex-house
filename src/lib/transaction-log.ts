import { prisma } from "./prisma";

export type EntityType = "CLIENT" | "INVOICE" | "PAYMENT" | "USER";
export type ActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "PAYMENT_RECEIVED"
  | "STATUS_CHANGE"
  | "ACTIVATE"
  | "DEACTIVATE";

interface LogDetails {
  [key: string]: unknown;
}

export async function createTransactionLog(
  entityType: EntityType,
  entityId: string,
  action: ActionType,
  userId: string,
  details: LogDetails
): Promise<void> {
  await prisma.transactionLog.create({
    data: {
      entityType,
      entityId,
      action,
      userId,
      details: JSON.stringify(details),
    },
  });
}

export async function getEntityLogs(
  entityType: EntityType,
  entityId: string,
  page: number = 1,
  pageSize: number = 10
) {
  const skip = (page - 1) * pageSize;

  const [logs, total] = await Promise.all([
    prisma.transactionLog.findMany({
      where: { entityType, entityId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.transactionLog.count({
      where: { entityType, entityId },
    }),
  ]);

  return {
    logs: logs.map((log) => ({
      ...log,
      details: JSON.parse(log.details),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getAllLogs(
  page: number = 1,
  pageSize: number = 20,
  filters?: {
    entityType?: EntityType;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};

  if (filters?.entityType) {
    where.entityType = filters.entityType;
  }
  if (filters?.userId) {
    where.userId = filters.userId;
  }
  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Record<string, unknown>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, unknown>).lte = filters.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.transactionLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.transactionLog.count({ where }),
  ]);

  return {
    logs: logs.map((log) => ({
      ...log,
      details: JSON.parse(log.details),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
