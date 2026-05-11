import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** NanoBanana требует callBackUrl; тело можно игнорировать и опираться на polling. */
export async function POST() {
  return NextResponse.json({ ok: true });
}
