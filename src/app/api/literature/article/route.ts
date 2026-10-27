import { NextRequest, NextResponse } from "next/server";
import { article } from "@/lib/literature";
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const source = p.get("source") ?? "";
  const id = p.get("id") ?? "";
  if (!/^[A-Z]{2,8}$/.test(source) || !/^[a-zA-Z0-9]{1,50}$/.test(id))
    return NextResponse.json(
      { error: "Invalid paper identifier." },
      { status: 400 },
    );
  try {
    return NextResponse.json(await article(source, id));
  } catch {
    return NextResponse.json(
      { error: "Paper details unavailable." },
      { status: 502 },
    );
  }
}
