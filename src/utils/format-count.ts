export function formatCompactCount(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const abs = Math.abs(n)
  if (abs < 1000) return String(n)
  if (abs < 1_000_000) {
    const v = n / 1000
    const rounded = Math.round(v * 10) / 10
    return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}k`
  }
  const v = n / 1_000_000
  const rounded = Math.round(v * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}m`
}
