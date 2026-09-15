import Link from "next/link"
import { LucideIcon } from "@/components/lucide-icon"

export default function ForbiddenPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-brand-dark font-sans">
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-brand-blue/20 to-brand-dark" />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-xl border border-brand-border bg-white p-8 shadow-bevel">
          <div className="mb-8 flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-gray-200 to-gray-400 p-1.5">
              <LucideIcon name="zap" size={20} className="text-brand-blue" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none text-brand-text-primary">SEION</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-blue">AutoPart AI</p>
            </div>
          </div>
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-brand-red">403</p>
          <h1 className="mb-2 text-2xl font-bold text-brand-text-primary">Access forbidden</h1>
          <p className="mb-6 text-sm text-brand-text-secondary">
            Your role cannot open this page. Ask a Plant Admin if you need access.
          </p>
          <Link
            href="/app"
            className="inline-flex rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blueHover"
          >
            Back to app
          </Link>
        </div>
      </main>
    </div>
  )
}
