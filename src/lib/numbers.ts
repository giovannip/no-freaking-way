/** Parse numeric input common in pt-BR (decimal comma, optional thousand dots). */
export function parsePtBrNumber(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "");
  if (!t) return null;
  let s = t;
  if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
  } else if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatPtBrNumber(n: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 }).format(n);
}
