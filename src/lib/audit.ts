import { AuditLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "REGISTER"
  | "LOGIN"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "TABLE_CREATE"
  | "TABLE_UPDATE"
  | "TABLE_DELETE"
  | "TABLE_RESTORE"
  | "TABLE_PURGE"
  | "USER_APPROVE"
  | "USER_REJECT"
  | "PASSWORD_RESET_REQUEST"
  | "PASSWORD_RESET_COMPLETE"
  | "PASSWORD_RESET_LIMIT";

const ACTION_LEVELS: Record<AuditAction, AuditLevel> = {
  REGISTER: "INFO",
  LOGIN: "INFO",
  LOGOUT: "INFO",
  TABLE_CREATE: "INFO",
  TABLE_UPDATE: "INFO",
  TABLE_RESTORE: "INFO",
  PASSWORD_RESET_COMPLETE: "INFO",
  LOGIN_FAILED: "WARNING",
  PASSWORD_RESET_REQUEST: "WARNING",
  PASSWORD_RESET_LIMIT: "WARNING",
  TABLE_DELETE: "DANGER",
  TABLE_PURGE: "DANGER",
  USER_REJECT: "DANGER",
  USER_APPROVE: "INFO",
};

interface AuditParams {
  action: AuditAction;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  ipAddress?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  level?: AuditLevel;
}

export async function createAuditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        level: params.level || ACTION_LEVELS[params.action] || "INFO",
        userId: params.userId || undefined,
        userEmail: params.userEmail || undefined,
        userName: params.userName || undefined,
        ipAddress: params.ipAddress || undefined,
        reason: params.reason || undefined,
        metadata: (params.metadata as object) || undefined,
      },
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
}

export const TRASH_RETENTION_DAYS = 15;

export function getTrashExpiryDate(deletedAt: Date): Date {
  const expiry = new Date(deletedAt);
  expiry.setDate(expiry.getDate() + TRASH_RETENTION_DAYS);
  return expiry;
}

export async function purgeExpiredTrash() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TRASH_RETENTION_DAYS);

  const expired = await prisma.dataTable.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true, title: true, authorId: true },
  });

  for (const table of expired) {
    await prisma.dataTable.delete({ where: { id: table.id } });
    await createAuditLog({
      action: "TABLE_PURGE",
      metadata: { tableId: table.id, title: table.title, authorId: table.authorId },
      reason: "Automatic purge after 15-day retention",
    });
  }

  return expired.length;
}
