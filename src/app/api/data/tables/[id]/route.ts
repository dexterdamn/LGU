import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  sector: z.string().optional(),
  subcategory: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  reason: z.string().min(1),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const table = await prisma.dataTable.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, nickname: true, officeAgency: true } },
      rows: { orderBy: { rowOrder: "asc" } },
    },
  });

  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  return NextResponse.json({ table });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const { id } = await params;
  const table = await prisma.dataTable.findUnique({ where: { id } });

  if (!table || table.deletedAt) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  if (session.role !== "ADMIN" && table.authorId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { reason, ...data } = updateSchema.parse(body);

    const updated = await prisma.dataTable.update({
      where: { id },
      data,
      include: {
        author: { select: { id: true, name: true, nickname: true, officeAgency: true } },
        rows: { orderBy: { rowOrder: "asc" } },
      },
    });

    await createAuditLog({
      action: "TABLE_UPDATE",
      userId: session.userId,
      userEmail: session.email,
      userName: session.name,
      ipAddress: ip,
      reason,
      metadata: { tableId: id, title: updated.title },
    });

    return NextResponse.json({ table: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!reason) {
    return NextResponse.json({ error: "Reason is required for deletion" }, { status: 400 });
  }

  const table = await prisma.dataTable.findUnique({ where: { id } });

  if (!table || table.deletedAt) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  if (session.role !== "ADMIN" && table.authorId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.dataTable.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedById: session.userId,
      deleteReason: reason,
    },
  });

  await createAuditLog({
    action: "TABLE_DELETE",
    userId: session.userId,
    userEmail: session.email,
    userName: session.name,
    ipAddress: ip,
    reason,
    metadata: { tableId: id, title: table.title, authorId: table.authorId },
  });

  return NextResponse.json({ success: true });
}
