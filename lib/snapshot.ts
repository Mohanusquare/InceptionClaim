import fs from "fs";
import path from "path";

/** Mirrors `build/build_html.py` */
export const DUST_THRESHOLD = 0.0001;
export const COMPANY_RANK_CUTOFF = 10;
export const KYC_THRESHOLD = 100;
const DIVISOR = 10 ** 18;

const EXCLUDE_ADDRESSES = new Set(
  [
    "0xeba81648d75ebbf4b40438cac4228f1b16b3a2b0",
    "0x17bfcbe93fb9b53b3404476af9a9e213f3e3b8ad",
    "0xdb4827901fb15710ebf1b0412a5c1cd0ae4d0587",
    "0x30a251ae346c70bf9ee7509f6249a48339a6e3a4",
    "0x66bfa4dd445333bcafa341687e6d1ae80c560186",
    "0x400815365efbc0c5af0e32d2c14d176d249bd773",
    "0xb04eb6b127a5588234fa6fd14df16ff00a7d466c",
  ].map((a) => a.toLowerCase()),
);

const DEX_ADDRESSES = new Set(
  [
    "0x10ed43c718714eb63d5aa57b78b54704e256024e",
    "0x13f4ea83d0bd40e75c8222255bc855a974568dd4",
    "0x1b81d678ffb9c0263b24a97847620c99d213eb14",
    "0x28e2ea090877bf75740558f6bfb36a5ffee9e9df",
    "0x66a9893cc07d91d95644aedd05d03f95e1dba8af",
    "0x6a000f20005980200259b80c5102003040001068",
    "0x111111125421ca6dc452d289314280a0f8842a65",
  ].map((a) => a.toLowerCase()),
);

const NULL_ADDR = "0x0000000000000000000000000000000000000000";

export type TxBucket = "buy" | "mint" | "rcv";

export interface SnapshotTx {
  h: string;
  t: string;
  f: string;
  v: number;
  b: TxBucket;
}

/** Compact eligible holder (same shape as embedded `HOLDERS` in the static portal). */
export interface EligibleHolder {
  r: number;
  a: string;
  b: number;
  p: number;
  n: number;
  tx: SnapshotTx[];
}

interface RawHolder {
  address: string;
  balance: number;
  pct: number;
}

interface HoldersSnapshotFile {
  holders: RawHolder[];
}

/** Raw row: [hash, block, ts_iso, from, value_raw_str] */
type TransferRow = [string, number, string, string, string];

type WalletTransfersFile = Record<string, TransferRow[]>;

let cachedList: EligibleHolder[] | null = null;
let cachedByAddress: Map<string, EligibleHolder> | null = null;

function dataPath(...segments: string[]) {
  return path.join(process.cwd(), "data", ...segments);
}

function loadHoldersSnapshot(): HoldersSnapshotFile {
  const raw = fs.readFileSync(dataPath("holders_snapshot.json"), "utf-8");
  return JSON.parse(raw) as HoldersSnapshotFile;
}

function loadWalletTransfers(): WalletTransfersFile {
  const raw = fs.readFileSync(dataPath("wallet_transfers.json"), "utf-8");
  return JSON.parse(raw) as WalletTransfersFile;
}

function labelTx(from: string): TxBucket {
  const f = from.toLowerCase();
  if (DEX_ADDRESSES.has(f)) return "buy";
  if (f === NULL_ADDR) return "mint";
  return "rcv";
}

function compactTxsForWallet(
  addr: string,
  transfers: WalletTransfersFile,
): SnapshotTx[] {
  const txsRaw = transfers[addr] ?? transfers[addr.toLowerCase()] ?? [];
  const out: SnapshotTx[] = [];
  for (const row of txsRaw) {
    const [hash_, _block, ts, frm, valueRaw] = row;
    out.push({
      h: hash_,
      t: ts,
      f: frm,
      v: Number(BigInt(valueRaw)) / DIVISOR,
      b: labelTx(frm),
    });
  }
  return out;
}

function buildEligibleHolders(): EligibleHolder[] {
  const snap = loadHoldersSnapshot();
  const transfers = loadWalletTransfers();

  const allHolders = snap.holders.filter((h) => h.balance > DUST_THRESHOLD);
  const publicHolders = allHolders
    .slice(COMPANY_RANK_CUTOFF)
    .filter((h) => !EXCLUDE_ADDRESSES.has(h.address.toLowerCase()));

  const out: EligibleHolder[] = [];
  for (let i = 0; i < publicHolders.length; i++) {
    const h = publicHolders[i]!;
    const addr = h.address.toLowerCase();
    const txCompact = compactTxsForWallet(addr, transfers);
    out.push({
      r: i + 1,
      a: addr,
      b: roundBalance(h.balance),
      p: roundPct(h.pct),
      n: txCompact.length,
      tx: txCompact,
    });
  }
  return out;
}

/** Same rounding as Python `round(..., 8)` / `round(..., 6)` for the built HTML. */
function roundBalance(n: number): number {
  return Math.round(n * 1e8) / 1e8;
}

function roundPct(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function ensureCache() {
  if (cachedList && cachedByAddress) return;
  const list = buildEligibleHolders();
  const byAddress = new Map<string, EligibleHolder>();
  for (const h of list) {
    byAddress.set(h.a.toLowerCase(), h);
  }
  cachedList = list;
  cachedByAddress = byAddress;
}

/** Full eligible list (cached for the lifetime of the Node process). */
export function getEligibleHolders(): EligibleHolder[] {
  ensureCache();
  return cachedList!;
}

/**
 * Returns the public eligible holder for `address`, or `null` if dust, excluded,
 * in the dropped top-10 slice, or unknown.
 */
export function getHolderByAddress(rawAddress: string): EligibleHolder | null {
  const addr = rawAddress.trim().toLowerCase();
  ensureCache();
  return cachedByAddress!.get(addr) ?? null;
}

/**
 * True if `claimedAmount` matches the snapshot balance for this wallet
 * (after the same rounding used in the static build).
 */
export function claimAmountMatchesHolder(
  holder: EligibleHolder,
  claimedAmount: number,
): boolean {
  if (!Number.isFinite(claimedAmount)) return false;
  const a = roundBalance(claimedAmount);
  const b = holder.b;
  const tol = 1e-8 * Math.max(1, Math.abs(b));
  return Math.abs(a - b) <= tol;
}

/** Test hook / hot reload in dev */
export function clearSnapshotCache() {
  cachedList = null;
  cachedByAddress = null;
}
