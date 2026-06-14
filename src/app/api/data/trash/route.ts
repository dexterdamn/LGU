import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, purgeExpiredTrash, getTrashExpiryDate } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

export async function GET(req: NextRequest) {
  await purgeExpiredTrash();

  const { searchParams } = new URL(req.url);
  const sector = searchParams.get("sector");
  const tag = searchParams.get("tag");
  const subcategory = searchParams.get("subcategory");
  const authorId = searchParams.get("authorId");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { deletedAt: { not: null } };
  if (sector) where.sector = sector;
  if (subcategory) where.subcategory = subcategory;
  if (authorId) where.authorId = authorId;
  if (tag) where.tags = { has: tag };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { source: { contains: search, mode: "insensitive" } },
    ];
  }

  const tables = await prisma.dataTable.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, nickname: true } },
      deletedBy: { select: { id: true, name: true, nickname: true } },
      _count: { select: { rows: true } },
    },
    orderBy: { deletedAt: "desc" },
  });

  const enriched = tables.map((t) => ({
    ...t,
    expiresAt: t.deletedAt ? getTrashExpiryDate(t.deletedAt).toISOString() : null,
  }));

  return NextResponse.json({ tables: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const { tableId, reason } = await req.json();

  if (!tableId || !reason?.trim()) {
    return NextResponse.json({ error: "Table ID and reason required" }, { status: 400 });
  }

  const table = await prisma.dataTable.findUnique({ where: { id: tableId } });
  if (!table || !table.deletedAt) {
    return NextResponse.json({ error: "Table not in trash" }, { status: 404 });
  }

  if (session.role !== "ADMIN" && table.authorId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.dataTable.update({
    where: { id: tableId },
    data: {
      deletedAt: null,
      deletedById: null,
      deleteReason: null,
    },
  });

  await createAuditLog({
    action: "TABLE_RESTORE",
    userId: session.userId,
    userEmail: session.email,
    userName: session.name,
    ipAddress: ip,
    reason: reason.trim(),
    metadata: { tableId, title: table.title },
  });

  return NextResponse.json({ success: true });
}
