import type { AlternativeStatus, BomStatus } from "@/lib/db/types"
import { cn } from "@/lib/utils"

const bomStyles: Record<BomStatus, string> = {
  DRAFT: "border-brand-border bg-gray-50 text-brand-text-secondary",
  EXTRACTING: "border-blue-100 bg-blue-50 text-brand-blue",
  ANALYZED: "border-green-100 bg-green-50 text-brand-green",
  FAILED: "border-red-100 bg-red-50 text-brand-red",
  APPROVED: "border-green-100 bg-green-50 text-brand-green",
}

const bomLabels: Record<BomStatus, string> = {
  DRAFT: "Draft",
  EXTRACTING: "Processing",
  ANALYZED: "Analyzed",
  FAILED: "Failed",
  APPROVED: "Approved",
}

export function BomStatusBadge({ status }: { status: BomStatus }) {
  return <Badge className={bomStyles[status]}>{bomLabels[status]}</Badge>
}

const altStyles: Record<AlternativeStatus, string> = {
  SUGGESTED: "border-brand-border bg-gray-50 text-brand-text-secondary",
  ACCEPTED: "border-green-100 bg-green-50 text-brand-green",
  REJECTED: "border-red-100 bg-red-50 text-brand-red",
}

const altLabels: Record<AlternativeStatus, string> = {
  SUGGESTED: "Suggested",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
}

export function AlternativeStatusBadge({ status }: { status: AlternativeStatus }) {
  return <Badge className={altStyles[status]}>{altLabels[status]}</Badge>
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-block shrink-0 rounded border px-2 py-0.5 text-[11px] font-semibold", className)}>
      {children}
    </span>
  )
}
