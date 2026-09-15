export function chunkRows<T>(rows: T[], size = 20): T[][] {
  if (size < 1) throw new Error("chunk size must be >= 1")
  const out: T[][] = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out
}
