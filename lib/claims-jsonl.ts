import fs from "fs";
import path from "path";

export const CLAIMS_DIR = path.join(process.cwd(), "claims");
export const CLAIMS_QUICK_PATH = path.join(CLAIMS_DIR, "claims_quick.jsonl");
export const CLAIMS_KYC_PATH = path.join(CLAIMS_DIR, "claims_kyc.jsonl");

const ETH_ADDR = /^0x[a-f0-9]{40}$/;

export function isEthAddress(s: string): boolean {
  return ETH_ADDR.test(s);
}

function parseJsonlFile(
  filePath: string,
  sink: Map<string, Record<string, unknown>>,
): void {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf-8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let rec: Record<string, unknown>;
    try {
      rec = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
    const w = String(rec.wallet ?? "").toLowerCase();
    if (!isEthAddress(w)) continue;
    const prev = sink.get(w);
    const ts = String(rec.ts ?? "");
    if (!prev || ts > String(prev.ts ?? "")) {
      sink.set(w, rec);
    }
  }
}

/**
 * Latest claim per wallet across `claims_quick.jsonl` then `claims_kyc.jsonl`,
 * using lexicographic comparison on `ts` (same order as `server.py`).
 */
export function readLatestClaimsByWallet(): Record<
  string,
  Record<string, unknown>
> {
  const latest = new Map<string, Record<string, unknown>>();
  parseJsonlFile(CLAIMS_QUICK_PATH, latest);
  parseJsonlFile(CLAIMS_KYC_PATH, latest);
  return Object.fromEntries(latest);
}

export function appendClaimLine(filePath: string, record: object): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(record) + "\n", "utf-8");
}
