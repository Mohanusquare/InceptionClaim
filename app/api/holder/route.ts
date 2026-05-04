import { NextRequest, NextResponse } from "next/server";

import { getHolderByAddress } from "@/lib/snapshot";

export const runtime = "nodejs";

export function GET(req: NextRequest) {
  const address = new URL(req.url).searchParams.get("address")?.trim();
  if (!address) {
    return NextResponse.json({ error: "missing address" }, { status: 400 });
  }
  const holder = getHolderByAddress(address);
  if (!holder) {
    return NextResponse.json({ eligible: false });
  }
  return NextResponse.json({ eligible: true, holder });
}
