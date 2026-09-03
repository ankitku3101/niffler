export function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100)
}

export function formatPercent(fraction: number): string {
  if (!Number.isFinite(fraction)) return "—"
  return `${(fraction * 100).toFixed(1)}%`
}

export function formatPercentPoints(fraction: number): string {
  if (!Number.isFinite(fraction)) return "—"
  const points = fraction * 100
  const sign = points > 0 ? "+" : ""
  return `${sign}${points.toFixed(1)} pts`
}
