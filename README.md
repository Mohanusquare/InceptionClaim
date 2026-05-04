# Inception 2.0 — Token Recovery Portal (Next.js)

A **Next.js** web app that lets eligible holders of the original
**WrappedInception (wINC)** BSC token claim their reissuance under the
new Inception 2.0 program. It is the same product and claim semantics as
the static bundle (`../inception2-claim-portal/`), with the UI and APIs
ported to the App Router: React components, `GET`/`POST` route handlers,
and JSONL claim storage on disk.

This README is the only thing you need to read to run, modify, deploy,
or replace any part of the system.

---

## Contents

```
next-portal/
├── app/
│   ├── page.tsx                # Home — composes PortalHome
│   ├── layout.tsx              # Shell, fonts, Navbar, ToastHost
│   ├── globals.css             # Tailwind + glass component fixes
│   ├── portal-parity.css       # Ported static-portal look & feel
│   └── api/
│       ├── claim/route.ts      # POST /api/claim → append JSONL
│       ├── claims/route.ts     # GET /api/claims → latest per wallet
│       ├── holder/route.ts     # GET /api/holder?address=… (detail)
│       ├── holders/route.ts    # GET /api/holders (paginated list)
│       └── snapshot-meta/route.ts
│
├── components/                   # Hero, explorer, modals, wallet UI
├── hooks/useWallet.ts          # EIP-6963 + legacy inject, connect/switch
├── lib/
│   ├── snapshot.ts             # Eligibility rules + holder lookup
│   ├── claims-jsonl.ts         # Paths + read/append JSONL
│   ├── format.ts               # fmtAddr, fmtBal, fmtPct, fmtTs
│   └── …
│
├── data/
│   ├── holders_snapshot.json   # Eligible-holder snapshot (same schema as static bundle)
│   └── wallet_transfers.json   # Per-wallet incoming transfer history
│
├── public/
│   ├── inception_logo.svg
│   └── inception_background.png
│
├── claims/                     # Runtime — claim records land here
│   └── .gitkeep
│
├── scripts/
│   └── extract-portal-css.mjs  # One-off CSS extraction helper
│
├── package.json
├── next.config.ts
└── tsconfig.json
```

**Regenerating snapshot data** still uses the Python pipeline in the
sibling folder `../inception2-claim-portal/build/` (`fetch_holders.py`).
Copy the generated `data/*.json` into `next-portal/data/` (or symlink).
There is no `build_html.py` step for Next — the app reads JSON from disk
at request time via `lib/snapshot.ts`.

---

## Quick start

```bash
cd next-portal
npm install
npm run dev
# → http://localhost:3000/
```

That serves the React app, exposes the claim API, and writes incoming
claims to `claims/claims_quick.jsonl` (≤ 100 wINC) and
`claims/claims_kyc.jsonl` (> 100 wINC) as one JSON object per line.
Status pills on the page (`Available`, `Claimed`, `Pending`) are
derived from those files via `GET /api/claims` (the client also polls
this endpoint every **10 s** so pills stay in sync).

The app must be opened over **http(s)** so wallet extensions inject
providers (same practical requirement as the static bundle when not
relying on `file://`).

---

## How the app works

### Data pipeline

1. **`build/fetch_holders.py`** (in `../inception2-claim-portal/build/`) queries Moralis for every wINC ERC-20
   transfer up to block `94 759 854` (one block before the suspected
   exploit address `0x2598…6bc3` started selling).
2. Balances are reconstructed by aggregating those transfers per
   address; the result is written to `data/holders_snapshot.json`.
3. Each holder's incoming transfer history (compact array form) is
   written to `data/wallet_transfers.json`.

Next.js reads those JSON files on the server (`lib/snapshot.ts`) instead of embedding them in a single HTML file.

### Eligibility

In `lib/snapshot.ts` (same rules as `build/build_html.py` in the static bundle):

- Wallets with balances at or below `0.0001 wINC` are dropped as dust.
- The **top 10 wallets by balance are removed** from the public list —
  these are company / treasury / DEX addresses. The compromised wallet
  was at original rank #4 and is included in this top-10 cull, so it
  is also excluded from the eligible list.
- Everything else is eligible; holder counts come from the current `data/` files when you run the app.

### Claim flow

1. User clicks **Connect wallet** (top-right or hero CTA).
2. The page enumerates injected wallets via EIP-6963 plus `window.*`
   fallbacks (MetaMask, Brave, Trust, Coinbase, Phantom-EVM, Rabby,
   OKX). No WalletConnect / QR.
3. After connecting:
   - If the address is in the eligible list, a floating panel shows
     balance, share, transaction count, and a **Claim** button.
   - If the balance is **≤ 100 wINC**: one-click confirmation; the
     server appends a record to `claims/claims_quick.jsonl`.
   - If the balance is **> 100 wINC**: a KYC modal appears (name,
     email, postal address, optional backoffice ID). On submit the
     server appends to `claims/claims_kyc.jsonl` with the full tx
     history (hashes, timestamps, amounts).
4. Status pill updates to `Claimed` (quick) or `Pending` (KYC).

The user can **disconnect** or **switch wallet / account** from the
dropdown that appears when clicking the connected pill. Switching
calls `wallet_requestPermissions` so the wallet's own account picker
appears (this is the only way to flip between two MetaMask accounts).

### Same behaviour as the static `index.html` (not spelled out in the bundle README)

- After connect, **matched** / **not found** dialogs match the old scrims when the address is or is not on the public list.
- **Eligible holders** table: row expand, claim row vs connected wallet, **mismatch** dialog.
- **`?address=0x…`** deep-link into the list when supported by the current filters.

---

## API

### `GET /api/claims`

Returns the latest claim record per wallet across both JSONL files,
keyed by lowercase address. Used by the frontend on load and every
**10 s** to keep status pills in sync.

```json
{
  "0xeba81648d75ebbf4b40438cac4228f1b16b3a2b0": {
    "received_at": "2026-05-02T09:50:41Z",
    "client_ip": "127.0.0.1",
    "wallet": "0xeba81648d75ebbf4b40438cac4228f1b16b3a2b0",
    "amount": 5870.30633247,
    "rank": 1,
    "tx_count": 16,
    "status": "pending",
    "ts": "2026-05-02T09:50:41.095Z",
    "kyc": { "name": "...", "email": "...", "address": "...", "backoffice_id": "..." },
    "tx_hashes":     ["0x…", "0x…"],
    "tx_timestamps": ["…",  "…"],
    "tx_amounts":    [4.00, 3.92]
  }
}
```

### `POST /api/claim`

Accepts a JSON body with at least `wallet` (lowercase 0x address) and
`amount` (number ≥ 0). The route:

- Validates the address shape and amount, and checks the wallet exists
  in the snapshot with a matching balance.
- Adds `received_at` (UTC ISO) and `client_ip` server-side.
- Appends one JSON object per line to either `claims_kyc.jsonl`
  (`amount > 100`) or `claims_quick.jsonl` (`amount ≤ 100`).
- Responds `{"ok": true, "stored_in": "claims_kyc.jsonl"}` (or
  `claims_quick.jsonl`).

Other JSON fields from the client (e.g. `rank`, `tx_count`, `kyc`,
`status`, `ts`) are passed through into the stored line as in the
static bundle.

### Other routes (Next-specific)

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/holder?address=0x…` | Eligibility + full holder + `tx[]` |
| `GET` | `/api/holders` | Paginated, filterable list for the table |
| `GET` | `/api/snapshot-meta` | Block, thresholds, totals for stats / UI |

---

## Operational tasks

### Refresh the snapshot data

From the **static bundle** repo (sibling folder):

```bash
cd ../inception2-claim-portal
cp .env.example .env       # add your MORALIS_API_KEY
export $(cat .env | xargs)   # Windows: set vars manually or use direnv
python3 build/fetch_holders.py     # writes data/holders_snapshot.json + data/wallet_transfers.json
```

Then copy or sync the two JSON files into **`next-portal/data/`** and
restart `npm run dev` (or your production process).

### Convert claims to CSV (for spreadsheet import)

Use the static bundle script (same JSONL format):

```bash
cd ../inception2-claim-portal
python3 scripts/jsonl_to_csv.py
# → claims/claims_kyc.csv, claims/claims_quick.csv
```

Run from a directory where `claims/*.jsonl` are the files you want to
export (e.g. copy `next-portal/claims/*.jsonl` there first, or adjust paths).

### Reset all claims

```bash
cd next-portal
rm -f claims/claims_*.jsonl claims/claims_*.csv
```

(On Windows PowerShell, use `Remove-Item` instead of `rm`.)

---

## Productionizing

The JSONL append path is intentionally simple — correct enough for dev
and the file format survives a backend swap. For real production:

- **Concurrent writes.** Under load, swap to a proper app server with
  file locking or move to a database (Postgres, Supabase, Firebase).
- **Auth on the GET endpoint.** `GET /api/claims` is currently public
  — it can return names + emails for KYC submitters. Either keep it
  public-with-PII-redacted, or split into two endpoints (`/api/status`
  for the public claim-status map, `/api/claims/admin` behind auth for
  the full payload).
- **Rate limiting + spam protection.** Add Cloudflare / a proxy in
  front, or implement an IP rate limiter. Consider requiring the user to
  sign a message (`personal_sign`) with the claimed address before
  accepting the claim — that proves ownership on-chain and prevents
  anyone from claiming an address they don't control.
- **HTTPS.** Run behind a reverse proxy (Caddy, nginx, Cloudflare).
  Wallet extensions require https for production deployments.
- **Deploy Next.js** on Vercel, Node, Docker, etc. Ensure `data/` and
  `claims/` are on persistent storage; set `NODE_ENV=production` and run
  `npm run build` + `npm start` (or your platform’s equivalent).

---

## Tech notes

- **Next.js App Router**, TypeScript, React 19. Styling is mostly the
  ported **`portal-parity.css`** plus Tailwind in `globals.css`.
- **Fonts** load from Google Fonts (Geist, Geist Mono, Italiana) via
  `<link>` in `layout.tsx` (same families as the static portal).
- **No analytics, no third-party trackers** in the shipped UI beyond
  fonts and normal BscScan links in the holder table.
- **Source data and Python pipeline are deterministic** — running
  `fetch_holders.py` again produces the same snapshot for the same
  block. The Moralis call takes on the order of minutes (~many paginated
  requests).

---

## Reference: chain context

| | |
| --- | --- |
| Token | WrappedInception (`wINC`) |
| Chain | BNB Smart Chain (BSC) |
| Contract | [`0xb04eb6b127a5588234fa6fd14df16ff00a7d466c`](https://bscscan.com/token/0xb04eb6b127a5588234fa6fd14df16ff00a7d466c) |
| Total supply | 21 000 000 wINC |
| Snapshot block | 94 759 854 |
| Compromised wallet | [`0x2598a49e99278c048c9b63ed27e3b4e97cd86bc3`](https://bscscan.com/address/0x2598a49e99278c048c9b63ed27e3b4e97cd86bc3) |
| First exploit tx | [`0x4d08…459b`](https://bscscan.com/tx/0x4d08324b309e8c79ddcebbcbd1df843ad1d9d23818b90209e27398cee8d7459b) (block 94 759 855) |
