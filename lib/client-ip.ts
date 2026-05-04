/** Best-effort client IP for server-side logging (honors common reverse-proxy headers). */
export function getClientIp(req: Request): string {
  const h = req.headers.get("x-forwarded-for");
  if (h) {
    const first = h.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();
  return "unknown";
}
