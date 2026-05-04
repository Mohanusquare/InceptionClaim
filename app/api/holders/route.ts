import { NextRequest, NextResponse } from "next/server";

import { getEligibleHolders, type EligibleHolder } from "@/lib/snapshot";

export const runtime = "nodejs";

function stripHolder(h: EligibleHolder) {
  return { r: h.r, a: h.a, b: h.b, p: h.p, n: h.n };
}

function lastTxTime(h: EligibleHolder): number {
  if (!h.tx?.length) return 0;
  return new Date(h.tx[h.tx.length - 1]!.t).getTime();
}

function firstTxTime(h: EligibleHolder): number {
  if (!h.tx?.length) return 0;
  return new Date(h.tx[0]!.t).getTime();
}

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(
    10000,
    Math.max(1, Number.parseInt(searchParams.get("limit") || "50", 10) || 50),
  );
  const sortKey = searchParams.get("sort") || "bal-desc";
  const minBalance = Number.parseFloat(searchParams.get("minBalance") || "0") || 0;
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  let list = getEligibleHolders().filter((h) => h.b >= minBalance);
  if (q) {
    list = list.filter(
      (h) => h.a.includes(q) || h.tx.some((tx) => tx.h.toLowerCase().includes(q)),
    );
  }

  const sorters: Record<string, (a: EligibleHolder, b: EligibleHolder) => number> = {
    "bal-desc": (a, b) => b.b - a.b,
    "bal-asc": (a, b) => a.b - b.b,
    "rank-asc": (a, b) => a.r - b.r,
    "rank-desc": (a, b) => b.r - a.r,
    "tx-desc": (a, b) => b.n - a.n,
    "tx-asc": (a, b) => a.n - b.n,
    "last-desc": (a, b) => lastTxTime(b) - lastTxTime(a),
    "last-asc": (a, b) => firstTxTime(a) - firstTxTime(b),
  };
  list = [...list].sort(sorters[sortKey] ?? sorters["bal-desc"]);

  const total = list.length;
  const start = (page - 1) * limit;
  const holders = list.slice(start, start + limit).map(stripHolder);

  return NextResponse.json({ page, limit, total, holders, sort: sortKey });
}
