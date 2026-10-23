import { NextResponse, type NextRequest } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, status: "healthy" });
}
