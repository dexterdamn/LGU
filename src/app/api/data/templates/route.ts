import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const includePrivate = req.nextUrl.searchParams.get("includePrivate") === "true";

  const templates = await prisma.dataTableTemplate.findMany({
    where: includePrivate && session.role === "ADMIN" 
      ? {} 
      : { isPublic: true },
    select: {
      id: true,
      title: true,
      description: true,
      sector: true,
      subcategory: true,
      tags: true,
      notes: true,
      columns: true,
      rowHeaders: true,
      colHeaders: true,
      showStatistics: true,
      statisticsTypes: true,
      createdBy: { select: { id: true, name: true, nickname: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const {
    title,
    description,
    sector,
    subcategory,
    tags,
    notes,
    columns,
    rowHeaders,
    colHeaders,
    showStatistics,
    statisticsTypes,
    isPublic,
    saveAsTemplate,
  } = await req.json();

  if (!saveAsTemplate) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!title || !sector || !subcategory) {
    return NextResponse.json(
      { error: "Title, sector, and subcategory are required" },
      { status: 400 }
    );
  }

  const template = await prisma.dataTableTemplate.create({
    data: {
      title,
      description,
      sector,
      subcategory,
      tags: tags || [],
      notes,
      columns: columns || [],
      rowHeaders,
      colHeaders,
      showStatistics: showStatistics || false,
      statisticsTypes: statisticsTypes || [],
      createdById: session.userId,
      isPublic: isPublic || false,
    },
  });

  await createAuditLog({
    action: "TEMPLATE_CREATE",
    userId: session.userId,
    userEmail: session.email,
    userName: session.name,
    ipAddress: ip,
    metadata: { templateId: template.id, isPublic },
  });

  return NextResponse.json({ success: true, template }, { status: 201 });
}
