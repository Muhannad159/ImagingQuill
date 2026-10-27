import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/literature";
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const q = p.get("q")?.trim() ?? "";
  const year = p.get("year");
  const cursor = p.get("cursor") ?? "*";
  if (
    q.length < 2 ||
    q.length > 300 ||
    cursor.length > 1000 ||
    (year && !/^\d{4}$/.test(year))
  )
    return NextResponse.json(
      { error: "Enter a search of 2–300 characters and a valid year." },
      { status: 400 },
    );
  try {
    const query = `(${q})${year ? ` AND FIRST_PDATE:[${year}-01-01 TO ${year}-12-31]` : ""}${p.get("oa") === "true" ? " AND OPEN_ACCESS:Y" : ""}${p.get("review") === "true" ? " AND PUB_TYPE:review" : ""}`;
    return NextResponse.json(await search(query, cursor));
  } catch {
    return NextResponse.json(
      { error: "Literature search is unavailable. Please retry." },
      { status: 502 },
    );
  }
}
