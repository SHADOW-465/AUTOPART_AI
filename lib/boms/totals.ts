export type TotalsItem = {
  quantity: number
  currentUnitCost: number | null
  acceptedAlternativeUnitCost: number | null
}

export function computeBomTotals(items: TotalsItem[]) {
  let totalOriginalCost = 0
  let totalOptimizedCost = 0

  for (const item of items) {
    if (item.currentUnitCost == null) continue
    const original = item.quantity * item.currentUnitCost
    const optimized =
      item.acceptedAlternativeUnitCost != null
        ? item.quantity * item.acceptedAlternativeUnitCost
        : original
    totalOriginalCost += original
    totalOptimizedCost += optimized
  }

  const totalSavingsPct =
    totalOriginalCost > 0 ? (100 * (totalOriginalCost - totalOptimizedCost)) / totalOriginalCost : 0

  return { totalOriginalCost, totalOptimizedCost, totalSavingsPct }
}
