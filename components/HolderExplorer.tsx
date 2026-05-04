"use client";

import { useSearchParams } from "next/navigation";
import { Fragment, Suspense, useCallback, useEffect, useRef, useState } from "react";

import { fmtAddr, fmtBal, fmtPct, fmtTs } from "@/lib/format";

import type { ClaimApiRecord } from "./ClaimStatusPanel";

export type HolderSummary = {
  r: number;
  a: string;
  b: number;
  p: number;
  n: number;
};

type HolderDetail = HolderSummary & {
  tx: { h: string; t: string; f: string; v: number; b: string }[];
};

type ListResponse = {
  page: number;
  limit: number;
  total: number;
  holders: HolderSummary[];
};

type Props = {
  kycThreshold: number;
  claims: Record<string, ClaimApiRecord>;
  totalEligible: number;
};

function statusFor(addr: string, claims: Record<string, ClaimApiRecord>) {
  const c = claims[addr.toLowerCase()];
  if (!c) return { cls: "available" as const, label: "Available" };
  if (c.status === "pending") return { cls: "pending" as const, label: "Pending" };
  return { cls: "claimed" as const, label: "Claimed" };
}

function IconSearch() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx={11} cy={11} r={7} />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function IconSort() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M3 6h18" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </svg>
  );
}

function IconChevDown() {
  return (
    <svg className="chev" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconChevRow() {
  return (
    <svg className="chev-btn" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function IconExt() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M5.5 2.5h-3v11h11v-3" />
      <path d="M9 2.5h4.5V7" />
      <path d="M7.5 8.5l6-6" />
    </svg>
  );
}

function AddressFromQuery({ onAddress }: { onAddress: (addr: string) => void }) {
  const sp = useSearchParams();
  const lastApplied = useRef<string | null>(null);

  useEffect(() => {
    const raw = sp.get("address");
    if (!raw) {
      lastApplied.current = null;
      return;
    }
    const norm = raw.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/i.test(norm)) return;
    if (lastApplied.current === norm) return;
    lastApplied.current = norm;
    onAddress(norm);
  }, [sp, onAddress]);

  return null;
}

export function HolderExplorer({ kycThreshold, claims, totalEligible }: Props) {
  const [paste, setPaste] = useState("");
  const [checkLoading, setCheckLoading] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<{ eligible: boolean; holder?: HolderDetail } | null>(null);

  const [searchVal, setSearchVal] = useState("");
  const [qActive, setQActive] = useState("");
  const [minAmt, setMinAmt] = useState("");
  const [sort, setSort] = useState("bal-desc");
  const page = 1;
  const limit = Math.max(1000, totalEligible || 0);
  const [list, setList] = useState<HolderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, HolderDetail>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [wantExpand, setWantExpand] = useState<string | null>(null);

  const onDeepLinkAddress = useCallback((norm: string) => {
    setPaste(norm);
    setSearchVal(norm);
    setWantExpand(norm);
    requestAnimationFrame(() => {
      document.getElementById("holders")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQActive(searchVal.trim().toLowerCase());
    }, 320);
    return () => window.clearTimeout(t);
  }, [searchVal]);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort,
        minBalance: minAmt || "0",
      });
      if (qActive) params.set("q", qActive);
      const r = await fetch(`/api/holders?${params}`, { cache: "no-store" });
      if (!r.ok) throw new Error("fail");
      const data = (await r.json()) as ListResponse;
      setList(data.holders);
      setTotal(data.total);
    } catch {
      setList([]);
      setTotal(0);
    } finally {
      setListLoading(false);
    }
  }, [page, limit, sort, minAmt, qActive]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!wantExpand || listLoading) return;
    const hit = list.some((h) => h.a === wantExpand);
    if (hit) {
      setExpanded(wantExpand);
      setWantExpand(null);
    }
  }, [wantExpand, list, listLoading]);

  const runPasteCheck = async () => {
    const addr = paste.trim();
    if (!addr) return;
    setCheckLoading(true);
    setCheckError(null);
    setCheckResult(null);
    try {
      const r = await fetch(`/api/holder?address=${encodeURIComponent(addr)}`, { cache: "no-store" });
      if (!r.ok) throw new Error("fail");
      const data = (await r.json()) as { eligible: boolean; holder?: HolderDetail };
      setCheckResult(data);
    } catch {
      setCheckError("Could not check this address.");
    } finally {
      setCheckLoading(false);
    }
  };

  const loadDetail = useCallback(
    async (addr: string) => {
      if (detailCache[addr]) return;
      setDetailLoading(addr);
      try {
        const r = await fetch(`/api/holder?address=${encodeURIComponent(addr)}`, { cache: "no-store" });
        const data = (await r.json()) as { eligible: boolean; holder?: HolderDetail };
        if (data.eligible && data.holder) {
          setDetailCache((c) => ({ ...c, [addr]: data.holder! }));
        }
      } finally {
        setDetailLoading(null);
      }
    },
    [detailCache],
  );

  useEffect(() => {
    if (!expanded) return;
    void loadDetail(expanded);
  }, [expanded, loadDetail]);

  const toggleRow = (addr: string) => {
    if (expanded === addr) {
      setExpanded(null);
      return;
    }
    setExpanded(addr);
  };

  const displayRank = (idx: number) => idx + 1;

  const countLabel =
    totalEligible > 0
      ? `${total.toLocaleString()} of ${totalEligible.toLocaleString()} ${total === 1 ? "wallet" : "wallets"}`
      : `${total.toLocaleString()} ${total === 1 ? "wallet" : "wallets"}`;

  const fireClaimRow = (addr: string) => {
    window.dispatchEvent(new CustomEvent("inception:claim-row", { detail: { address: addr } }));
  };

  return (
    <>
      <Suspense fallback={null}>
        <AddressFromQuery onAddress={onDeepLinkAddress} />
      </Suspense>

      <section className="check-address glass">
        <h2>Check any address</h2>
        <p className="lede">
          Paste a full <span className="check-address-mono">0x</span> address to see if it appears in the public
          eligible list.
        </p>
        <div className="controls" style={{ gridTemplateColumns: "1fr auto" }}>
          <label className="ctrl ctrl-search">
            <IconSearch />
            <input
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder="0x…"
              spellCheck={false}
              onKeyDown={(e) => e.key === "Enter" && void runPasteCheck()}
            />
          </label>
          <button type="button" className="btn primary" disabled={checkLoading} onClick={() => void runPasteCheck()}>
            {checkLoading ? "…" : "Check eligibility"}
          </button>
        </div>
        {checkError && (
          <p style={{ margin: 0, color: "var(--warn-ink)", fontSize: 13 }}>{checkError}</p>
        )}
        {checkResult && (
          <div className="matched-card" style={{ marginTop: 8 }}>
            {!checkResult.eligible ? (
              <p style={{ margin: 0, color: "var(--ink-muted)" }}>This address is not in the eligible public list.</p>
            ) : checkResult.holder ? (
              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)" }}>
                <strong style={{ color: "var(--ok-ink)" }}>Eligible</strong> · Rank #{checkResult.holder.r} ·{" "}
                {fmtBal(checkResult.holder.b)} wINC · {checkResult.holder.n} incoming transfers
                {checkResult.holder.b > kycThreshold && (
                  <span style={{ display: "block", marginTop: 8, fontSize: 12, color: "var(--gold-deep)" }}>
                    Over {kycThreshold} wINC — connect this wallet in the header to complete KYC.
                  </span>
                )}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="holders glass" id="holders">
        <div className="holders-head">
          <h2>
            Eligible holders <small id="holders-count">{countLabel}</small>
          </h2>
          <div className="controls">
            <label className="ctrl ctrl-search">
              <IconSearch />
              <input
                id="search"
                type="search"
                placeholder="Search address or tx hash"
                autoComplete="off"
                spellCheck={false}
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
              />
            </label>
            <label className="ctrl ctrl-amt" title="Minimum balance">
              <input
                id="min-amt"
                type="number"
                placeholder="Min wINC"
                step="any"
                min={0}
                value={minAmt}
                onChange={(e) => {
                  setMinAmt(e.target.value);
                }}
              />
            </label>
            <label className="ctrl">
              <IconSort />
              <select
                id="sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                }}
              >
                <option value="bal-desc">Balance ▾ (high → low)</option>
                <option value="bal-asc">Balance ▴ (low → high)</option>
                <option value="rank-asc">Rank ▴ (1 → N)</option>
                <option value="rank-desc">Rank ▾ (N → 1)</option>
                <option value="tx-desc">Most transactions</option>
                <option value="tx-asc">Fewest transactions</option>
                <option value="last-desc">Most recent activity</option>
                <option value="last-asc">Earliest activity</option>
              </select>
              <IconChevDown />
            </label>
            <button
              type="button"
              className="reset"
              id="reset"
              onClick={() => {
                setSearchVal("");
                setMinAmt("");
                setSort("bal-desc");
                setQActive("");
              }}
            >
              Reset
            </button>
          </div>
        </div>
        <div className="holders-table-scroll w-full overflow-x-auto custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="holders-table-inner min-w-[600px]">
            <div className="holders-cols">
              <span>#</span>
              <span>Address</span>
              <span className="right">Balance</span>
              <span className="right col-share">Share</span>
              <span className="center">Status</span>
              <span />
            </div>
            {listLoading ? (
              <p style={{ padding: 24, textAlign: "center", color: "var(--ink-faint)" }}>Loading…</p>
            ) : (
              <ul id="rows" aria-live="polite">
            {list.map((h, i) => {
              const open = expanded === h.a;
              const detail = detailCache[h.a];
              const st = statusFor(h.a, claims);
              const dr = displayRank(i);
              const claim = claims[h.a.toLowerCase()];
              const nTx = detail?.tx.length ?? h.n;

              return (
                <Fragment key={h.a}>
                  <li
                    className={`row${open ? " open" : ""}`}
                    tabIndex={0}
                    onClick={() => toggleRow(h.a)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleRow(h.a);
                      }
                    }}
                  >
                    <span className="rank">
                      <IconChevRow />#{dr}
                    </span>
                    <span className="addr-cell">
                      <span className="addr-mono">{fmtAddr(h.a)}</span>
                    </span>
                    <span className="balance">
                      <span>{fmtBal(h.b)}</span>
                      <span className="unit">wINC</span>
                    </span>
                    <span className="share">{fmtPct(h.p)}%</span>
                    <span className="status">
                      <span className={`pill ${st.cls}`}>
                        <span className="dot" />
                        {st.label}
                      </span>
                    </span>
                    <a
                      className="ext"
                      href={`https://bscscan.com/token/0xb04eb6b127a5588234fa6fd14df16ff00a7d466c?a=${h.a}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open on BscScan"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconExt />
                    </a>
                  </li>
                  <li className="row-detail" aria-hidden={!open}>
                    {open && (
                      <>
                        <div className="detail-head">
                          <h4>
                            Transaction history{" "}
                            <small>
                              {nTx} incoming transfer{nTx === 1 ? "" : "s"}
                            </small>
                          </h4>
                          {claim ? (
                            <button type="button" className="claim-btn" disabled>
                              {claim.status === "pending" ? "Pending verification" : "Claimed"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="claim-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                fireClaimRow(h.a);
                              }}
                            >
                              Claim this wallet →
                            </button>
                          )}
                        </div>
                        {detailLoading === h.a && (
                          <div className="tx-empty">Loading transfers…</div>
                        )}
                        {detail && detailLoading !== h.a && detail.tx.length === 0 && (
                          <div className="tx-empty">
                            No incoming transfers recorded for this address before the snapshot.
                          </div>
                        )}
                        {detail && detailLoading !== h.a && detail.tx.length > 0 && (
                          <div className="tx-table">
                            {detail.tx.map((tx) => {
                              const kindLabel =
                                tx.b === "buy" ? "Buy" : tx.b === "mint" ? "Mint" : "Received";
                              return (
                                <div key={tx.h} className="tx-row">
                                  <span className={`kind ${tx.b}`}>{kindLabel}</span>
                                  <span className="from">
                                    {tx.f === "0x0000000000000000000000000000000000000000"
                                      ? "mint event (null address)"
                                      : fmtAddr(tx.f)}
                                  </span>
                                  <span className="ts">{fmtTs(tx.t)}</span>
                                  <span className="amt">
                                    {fmtBal(tx.v)} wINC
                                  </span>
                                  <a
                                    className="ext-link"
                                    href={`https://bscscan.com/tx/${tx.h}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="View tx"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <IconExt />
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </li>
                </Fragment>
              );
            })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
