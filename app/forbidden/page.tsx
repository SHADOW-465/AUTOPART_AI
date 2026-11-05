import Link from "next/link"
import { AuthCard } from "@/components/seion/auth-card"

export default function ForbiddenPage() {
  return (
    <AuthCard>
      <p className="mb-2 text-sm font-bold uppercase tracking-wider text-brand-red">403</p>
      <h1 className="mb-2 text-2xl font-bold text-brand-text-primary">Access forbidden</h1>
      <p className="mb-6 text-sm text-brand-text-secondary">
        Your role cannot open this page. Ask a plant admin if you need access.
      </p>
      <Link
        href="/app"
        className="inline-flex rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blueHover"
      >
        Back to app
      </Link>
    </AuthCard>
  )
}
