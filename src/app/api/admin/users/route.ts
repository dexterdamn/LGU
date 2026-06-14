import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { role: "DATA_ENCODER" },
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      officeAgency: true,
      sex: true,
      status: true,
      createdAt: true,
      approvedAt: true,
      _count: { select: { dataTables: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const ip = getClientIp(req);
  const { userId, action, reason } = await req.json();

  if (!userId || !["approve", "reject", "disable", "enable", "delete"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if ((action === "reject" || action === "disable" || action === "delete") && !reason?.trim()) {
    return NextResponse.json({ error: "Reason is required" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Handle delete - transfer ownership of tables to admin
  if (action === "delete") {
    await prisma.dataTable.updateMany({
      where: { authorId: userId },
      data: {
        authorId: session.userId,
        previousAuthorName: target.nickname || target.name,
      },
    });

    await prisma.user.delete({
      where: { id: userId },
    });

    await createAuditLog({
      action: "USER_DELETE",
      userId: session.userId,
      userEmail: session.email,
      userName: session.name,
      ipAddress: ip,
      reason: reason.trim(),
      metadata: { deletedUserId: userId, deletedUserEmail: target.email },
    });

    return NextResponse.json({ success: true, message: "User deleted and tables transferred" });
  }

  // Handle disable
  if (action === "disable") {
    await prisma.user.update({
      where: { id: userId },
      data: { status: "DISABLED" },
    });

    await createAuditLog({
      action: "USER_DISABLE",
      userId: session.userId,
      userEmail: session.email,
      userName: session.name,
      ipAddress: ip,
      reason: reason.trim(),
      metadata: { targetUserId: userId, targetEmail: target.email },
    });

    return NextResponse.json({ success: true });
  }

  // Handle enable
  if (action === "enable") {
    await prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
    });

    await createAuditLog({
      action: "USER_ENABLE",
      userId: session.userId,
      userEmail: session.email,
      userName: session.name,
      ipAddress: ip,
      metadata: { targetUserId: userId, targetEmail: target.email },
    });

    return NextResponse.json({ success: true });
  }

  // Handle approve/reject
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      status: action === "approve" ? "ACTIVE" : "REJECTED",
      approvedAt: action === "approve" ? new Date() : null,
      approvedById: action === "approve" ? session.userId : null,
    },
  });

  await createAuditLog({
    action: action === "approve" ? "USER_APPROVE" : "USER_REJECT",
    userId: session.userId,
    userEmail: session.email,
    userName: session.name,
    ipAddress: ip,
    reason: reason.trim(),
    metadata: { targetUserId: userId, targetEmail: target.email },
  });

  return NextResponse.json({ success: true, user });
}
