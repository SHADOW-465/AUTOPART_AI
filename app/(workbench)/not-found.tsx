import Link from "next/link"
import { buttonClass, EmptyState } from "@/components/seion/ui"
import { getStorageInfo } from "@/lib/db/app"

export default function NotFound() {
  const { ephemeral } = getStorageInfo()
  return (
    <EmptyState title="Not found">
      <p>This record doesn&apos;t exist, or it was deleted.</p>
      {ephemeral ? (
        <p className="mt-2 text-xs">
          This demo instance keeps data in temporary storage, so it may have been reset or served from a fresh server instance. Load the demo
          data again or re-upload the BOM.
        </p>
      ) : null}
      <div className="mt-4 flex justify-center gap-2">
        <Link href="/boms" className={buttonClass("primary", "sm")}>
          Go to BOMs
        </Link>
        <Link href="/" className={buttonClass("secondary", "sm")}>
          Dashboard
        </Link>
      </div>
    </EmptyState>
  )
}
