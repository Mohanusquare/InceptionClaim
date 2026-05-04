/**
 * One-off: ensure 0xff435237e0b8f86fe2f5ced6ca31e4aee4d46aa9 is in snapshot + transfers.
 * Run: node scripts/add-holder.mjs <path-to-data-dir>
 * Example: node scripts/add-holder.mjs ./data
 *          node scripts/add-holder.mjs ../inception2-claim-portal/data
 */
import fs from "fs";
import path from "path";

const NEW = "0xff435237e0b8f86fe2f5ced6ca31e4aee4d46aa9".toLowerCase();
const TEMPLATE = "0x31da29b6810a014bd59ec6275b63862d2fcd09d3".toLowerCase();

const dataDir = path.resolve(process.argv[2] || "./data");
const snapPath = path.join(dataDir, "holders_snapshot.json");
const txPath = path.join(dataDir, "wallet_transfers.json");

const snap = JSON.parse(fs.readFileSync(snapPath, "utf-8"));
const transfers = JSON.parse(fs.readFileSync(txPath, "utf-8"));

// Remove misplaced trailing entry for NEW if present
snap.holders = snap.holders.filter((h) => h.address.toLowerCase() !== NEW);

const idx = snap.holders.findIndex((h) => h.address.toLowerCase() === TEMPLATE);
if (idx === -1) throw new Error(`Template holder ${TEMPLATE} not found`);

const tpl = snap.holders[idx];
const row = {
  address: NEW,
  raw_balance: tpl.raw_balance,
  balance: tpl.balance,
  pct: tpl.pct,
};
snap.holders.splice(idx + 1, 0, row);
snap.total_holders = snap.holders.length;

const tplTx = transfers[TEMPLATE];
if (!tplTx?.length) throw new Error(`No transfers for template ${TEMPLATE}`);
transfers[NEW] = JSON.parse(JSON.stringify(tplTx));

fs.writeFileSync(snapPath, JSON.stringify(snap, null, 2) + "\n");
fs.writeFileSync(txPath, JSON.stringify(transfers));
console.log("Updated", snapPath);
console.log("Updated", txPath, "tx count", transfers[NEW].length);
