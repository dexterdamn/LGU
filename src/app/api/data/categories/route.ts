import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_CATEGORIES, DEFAULT_SUBCATEGORIES } from "@/lib/categorization";
import { getAuthorDisplayName } from "@/lib/display-name";

export async function GET() {
  const [tables, authors] = await Promise.all([
    prisma.dataTable.findMany({
      where: { deletedAt: null },
      select: { sector: true, subcategory: true, tags: true },
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { dataTables: { some: { deletedAt: null } } },
          { dataTables: { some: { deletedAt: { not: null } } } },
        ],
      },
      select: { id: true, name: true, nickname: true },
    }),
  ]);

  const sectors = [...new Set([...DEFAULT_CATEGORIES, ...tables.map((t) => t.sector)])].sort();
  const subcategories = [
    ...new Set([
      ...Object.values(DEFAULT_SUBCATEGORIES).flat(),
      ...tables.map((t) => t.subcategory),
    ]),
  ].sort();
  const tags = [...new Set(tables.flatMap((t) => t.tags))].sort();

  return NextResponse.json({
    sectors,
    subcategories,
    tags,
    authors: authors.map((a) => ({
      id: a.id,
      name: getAuthorDisplayName(a),
    })),
  });
}
