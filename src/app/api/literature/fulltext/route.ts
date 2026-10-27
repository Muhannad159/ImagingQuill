import { NextRequest, NextResponse } from "next/server";
import { fulltext } from "@/lib/literature";
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("pmcid") ?? "";
  if (!/^PMC\d{1,12}$/.test(id))
    return NextResponse.json(
      { error: "A valid PMCID is required." },
      { status: 400 },
    );
  try {
    return NextResponse.json(await fulltext(id));
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Article unavailable.",
      },
      { status: 422 },
    );
  }
}
