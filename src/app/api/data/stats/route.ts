import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { purgeExpiredTrash } from "@/lib/audit";

export async function GET() {
  await purgeExpiredTrash();
  const session = await getSession();

  const [
    totalTables,
    totalRows,
    sectorCounts,
    recentTables,
    myTables,
  ] = await Promise.all([
    prisma.dataTable.count({ where: { deletedAt: null } }),
    prisma.dataRow.count({
      where: { table: { deletedAt: null } },
    }),
    prisma.dataTable.groupBy({
      by: ["sector"],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    prisma.dataTable.findMany({
      where: { deletedAt: null },
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        author: { select: { name: true, nickname: true } },
        _count: { select: { rows: true } },
      },
    }),
    session
      ? prisma.dataTable.count({
          where: { authorId: session.userId, deletedAt: null },
        })
      : Promise.resolve(0),
  ]);

  return NextResponse.json({
    stats: {
      totalTables,
      totalRows,
      myTables,
      sectorCounts: sectorCounts.map((s) => ({
        sector: s.sector,
        count: s._count.id,
      })),
      recentTables,
    },
  });
}
