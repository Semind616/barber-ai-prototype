import { NextResponse } from "next/server";
import { getTempImage } from "@/lib/tempImageStore";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const entry = getTempImage(token);
  if (!entry) {
    return new NextResponse("Not found", { status: 404 });
  }

  const arrayBuffer = entry.buffer.buffer.slice(
    entry.buffer.byteOffset,
    entry.buffer.byteOffset + entry.buffer.byteLength
  ) as ArrayBuffer;
  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": entry.mimeType,
      "Cache-Control": "private, no-store",
    },
  });
}
