import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    // Get total users
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { status: "ACTIVE" } });
    const disabledUsers = await prisma.user.count({ where: { status: "DISABLED" } });
    const pendingUsers = await prisma.user.count({ where: { status: "PENDING_APPROVAL" } });

    // Get total data tables
    const totalTables = await prisma.dataTable.count({ where: { deletedAt: null } });
    const trashedTables = await prisma.dataTable.count({ where: { NOT: { deletedAt: null } } });

    // Get users by role
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    const encoderCount = await prisma.user.count({ where: { role: "DATA_ENCODER" } });

    // Get tables by sector (top 5)
    const tablesBySector = await prisma.dataTable.groupBy({
      by: ["sector"],
      where: { deletedAt: null },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentTables = await prisma.dataTable.count({
      where: {
        deletedAt: null,
        createdAt: { gte: sevenDaysAgo },
      },
    });
    const recentUsers = await prisma.user.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
    });

    // Get tables per user (average)
    const tablesPerUser = await prisma.dataTable.count({
      where: { deletedAt: null },
    });
    const avgTablesPerUser = totalUsers > 0 ? (tablesPerUser / activeUsers).toFixed(2) : "0";

    return NextResponse.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        disabled: disabledUsers,
        pending: pendingUsers,
        admins: adminCount,
        encoders: encoderCount,
      },
      tables: {
        total: totalTables,
        trashed: trashedTables,
        recentlyAdded: recentTables,
      },
      analytics: {
        avgTablesPerUser,
        recentUsers,
        tablesBySector: tablesBySector.map((item) => ({
          sector: item.sector,
          count: item._count.id,
        })),
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
