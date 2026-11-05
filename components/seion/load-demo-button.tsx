"use client"

import { Database } from "lucide-react"
import { loadDemoDataAction } from "@/lib/actions/boms"
import { ActionButton } from "./client"

export function LoadDemoButton({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <ActionButton action={loadDemoDataAction} size={size} confirm="Add two demo BOMs (with decisions and RFQs) for testing?">
      <Database className="h-3.5 w-3.5" aria-hidden /> Load demo data
    </ActionButton>
  )
}
