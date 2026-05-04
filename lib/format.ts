export function fmtAddr(a: string): string {
  if (a.length < 10) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function fmtBal(v: number): string {
  if (v >= 1) {
    return v.toLocaleString("en-US", {
      maximumFractionDigits: 4,
      minimumFractionDigits: 2,
    });
  }
  return v.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function fmtPct(p: number): string {
  return p.toLocaleString("en-US", {
    maximumFractionDigits: p >= 1 ? 3 : 5,
  });
}

/** UTC day + time, matching static portal `fmtTs`. */
export function fmtTs(iso: string): string {
  const d = new Date(iso);
  const day = d.toUTCString().slice(5, 16);
  const time = d.toUTCString().slice(17, 22);
  return `${day} ${time}`;
}
