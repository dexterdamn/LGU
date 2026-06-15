import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseCSV } from "@/lib/csv-parser";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Only CSV files are supported" },
        { status: 400 }
      );
    }

    const csvContent = await file.text();
    const parsed = parseCSV(csvContent);

    const rowHeaders = parsed.rowHeaders.length
      ? parsed.rowHeaders
      : Object.keys(parsed.values);

    const firstRowKey = Object.keys(parsed.values)[0];
    const colHeaders = parsed.colHeaders.length
      ? parsed.colHeaders
      : firstRowKey
      ? Object.keys(parsed.values[firstRowKey])
      : [];

    return NextResponse.json({
      success: true,
      data: {
        rowHeaders,
        colHeaders,
        values: parsed.values,
      },
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: "Failed to parse CSV file" },
      { status: 500 }
    );
  }
}
