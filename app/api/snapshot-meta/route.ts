import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

import { getEligibleHolders, KYC_THRESHOLD } from "@/lib/snapshot";

export const runtime = "nodejs";

export function GET() {
  const holders = getEligibleHolders();
  const snapPath = path.join(process.cwd(), "data", "holders_snapshot.json");
  const snap = JSON.parse(fs.readFileSync(snapPath, "utf-8")) as {
    snapshot_block: number;
    hacker_first_sell_timestamp?: string;
  };
  const totalTxs = holders.reduce((s, h) => s + h.n, 0);
  let snapshot_time: string | undefined;
  if (snap.hacker_first_sell_timestamp) {
    const d = new Date(snap.hacker_first_sell_timestamp);
    snapshot_time = d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    });
  }
  return NextResponse.json({
    snapshot_block: snap.snapshot_block,
    snapshot_time,
    kyc_threshold: KYC_THRESHOLD,
    total_eligible: holders.length,
    total_txs: totalTxs,
  });
}
