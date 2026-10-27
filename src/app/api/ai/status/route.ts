import { configured } from "@/lib/quota";
export async function GET() {
  return Response.json(
    { available: configured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
