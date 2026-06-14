import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

const bulkSchema = z.object({
  values: z.record(z.union([z.string(), z.number(), z.null()])),
  reason: z.string().min(1),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const rows = await prisma.dataRow.findMany({
    where: { tableId: id },
    orderBy: { rowOrder: "asc" },
  });

  return NextResponse.json({ rows });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const { id: tableId } = await params;
  const table = await prisma.dataTable.findUnique({ where: { id: tableId } });

  if (!table || table.deletedAt) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  if (session.role !== "ADMIN" && table.authorId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = bulkSchema.parse(body);

    await prisma.dataRow.deleteMany({ where: { tableId } });
    const row = await prisma.dataRow.create({
      data: {
        tableId,
        values: data.values,
        rowOrder: 0,
      },
    });

    await createAuditLog({
      action: "TABLE_UPDATE",
      userId: session.userId,
      userEmail: session.email,
      userName: session.name,
      ipAddress: ip,
      reason: data.reason,
      metadata: { tableId, title: table.title, action: "save_data" },
    });

    return NextResponse.json({ rows: [row] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Save rows error:", error);
    return NextResponse.json({ error: "Failed to save rows" }, { status: 500 });
  }
}
