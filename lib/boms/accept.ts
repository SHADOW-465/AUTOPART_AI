import type { AlternativeStatus } from "@/lib/db/types"

export function statusesAfterAccept(
  alternativeIds: string[],
  acceptedId: string,
): Record<string, AlternativeStatus> {
  const next: Record<string, AlternativeStatus> = {}
  for (const id of alternativeIds) {
    next[id] = id === acceptedId ? "ACCEPTED" : "REJECTED"
  }
  return next
}
