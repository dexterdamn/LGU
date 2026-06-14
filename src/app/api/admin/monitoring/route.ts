import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level");
  const action = searchParams.get("action");
  const limit = Math.min(Number(searchParams.get("limit") || 100), 500);

  const where: Record<string, unknown> = {};
  if (level && ["INFO", "WARNING", "DANGER"].includes(level)) {
    where.level = level;
  }
  if (action) where.action = action;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ logs });
}
