import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { autoDetectTags } from "@/lib/categorization";
import { createAuditLog, purgeExpiredTrash } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { buildEmptyGrid, HeaderNode, flattenHeaderLeaves } from "@/lib/table-headers";

const headerNodeSchema: z.ZodType<HeaderNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    children: z.array(headerNodeSchema).optional(),
  })
);

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  sector: z.string().min(1),
  subcategory: z.string().min(1),
  source: z.string().optional(),
  notes: z.string().optional(),
  rowHeaders: z.array(headerNodeSchema).min(1),
  colHeaders: z.array(headerNodeSchema).min(1),
  showStatistics: z.boolean().optional(),
  statisticsTypes: z.array(z.enum(["total", "average", "min", "max", "count"])).optional(),
  tags: z.array(z.string()).optional(),
  templateId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  await purgeExpiredTrash();

  const { searchParams } = new URL(req.url);
  const sector = searchParams.get("sector");
  const tag = searchParams.get("tag");
  const subcategory = searchParams.get("subcategory");
  const authorId = searchParams.get("authorId");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { deletedAt: null };
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
      author: { select: { id: true, name: true, nickname: true, officeAgency: true } },
      _count: { select: { rows: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ tables });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const rowLabels = flattenHeaderLeaves(data.rowHeaders).flatMap((l) => l.path);
    const colLabels = flattenHeaderLeaves(data.colHeaders).flatMap((l) => l.path);
    const autoTags = autoDetectTags(data.title, rowLabels, colLabels);
    const tags = [...new Set([...(data.tags || []), ...autoTags.tags])];

    const gridValues = buildEmptyGrid(data.rowHeaders, data.colHeaders);

    const table = await prisma.$transaction(async (tx) => {
      const created = await tx.dataTable.create({
        data: {
          title: data.title,
          description: data.description,
          sector: data.sector,
          subcategory: data.subcategory,
          tags,
          source: data.source,
          notes: data.notes,
          rowHeaders: data.rowHeaders as object,
          colHeaders: data.colHeaders as object,
          showStatistics: data.showStatistics ?? false,
          statisticsTypes: data.statisticsTypes ?? [],
          columns: [],
          authorId: session.userId,
        },
        include: {
          author: { select: { id: true, name: true, nickname: true, officeAgency: true } },
        },
      });

      await tx.dataRow.create({
        data: {
          tableId: created.id,
          values: gridValues,
          rowOrder: 0,
        },
      });

      return created;
    });

    await createAuditLog({
      action: "TABLE_CREATE",
      userId: session.userId,
      userEmail: session.email,
      userName: session.name,
      ipAddress: ip,
      metadata: { tableId: table.id, title: table.title },
    });

    return NextResponse.json({ table }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error("Create table error:", error);
    return NextResponse.json({ error: "Failed to create table" }, { status: 500 });
  }
}
