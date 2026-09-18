import Link from "next/link"
import { CheckCircle, ChevronRight, TrendingUp, Upload, Zap } from "lucide-react"
import { Logo } from "@/components/seion/logo"

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-brand-dark font-sans">
      <nav className="z-10 mx-auto flex w-full max-w-7xl items-center justify-between p-6">
        <Logo inverted />
        <Link
          href="/login"
          className="rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/50 transition hover:bg-brand-blueHover"
        >
          Login
        </Link>
      </nav>

      <main className="relative z-10 mx-auto mt-10 flex max-w-5xl flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-white md:text-7xl">
          Upload Your BOM.
          <br />
          <span className="text-blue-300">Save ₹1-5L/Month.</span>
        </h1>
        <p className="mb-12 max-w-2xl text-lg text-gray-300 md:text-xl">
          The AI suggestion engine for Tier-2 suppliers. Find cheaper, compliant Indian Standard alternatives in 60
          seconds.
        </p>

        <div className="mb-12 flex flex-col items-center gap-4 md:flex-row md:gap-12">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-blue-300">
              <Upload className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-white">1. Upload PDF</span>
          </div>
          <ChevronRight className="hidden text-white/40 md:block" />
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-blue-300">
              <Zap className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-white">2. AI Analyze</span>
          </div>
          <ChevronRight className="hidden text-white/40 md:block" />
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-blue-300">
              <span className="text-xl font-bold">₹</span>
            </div>
            <span className="text-sm font-medium text-white">3. Save Costs</span>
          </div>
        </div>

        <Link
          href="/login"
          className="flex items-center gap-2 rounded-lg bg-brand-red px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-red-900/50 transition hover:bg-red-700"
        >
          Sign in <Zap className="h-5 w-5" />
        </Link>
      </main>

      <section className="relative z-20 mt-20 w-full bg-brand-surface px-4 py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-xl border border-brand-border bg-white p-8 shadow-bevel">
            <CheckCircle className="mb-4 h-12 w-12 text-brand-green" />
            <h3 className="mb-2 text-xl font-bold text-brand-text-primary">Standards-backed matching</h3>
            <p className="leading-relaxed text-brand-text-secondary">
              Alternatives checked against IS, DIN, and USCAR rules your plant actually uses.
            </p>
          </div>
          <div className="rounded-xl border border-brand-border bg-white p-8 shadow-bevel">
            <Zap className="mb-4 h-12 w-12 text-brand-blue" />
            <h3 className="mb-2 text-xl font-bold text-brand-text-primary">Hours back to procurement</h3>
            <p className="leading-relaxed text-brand-text-secondary">
              Automated BOM analysis instead of hunting catalogs line by line.
            </p>
          </div>
          <div className="rounded-xl border border-brand-border bg-white p-8 shadow-bevel">
            <TrendingUp className="mb-4 h-12 w-12 text-brand-red" />
            <h3 className="mb-2 text-xl font-bold text-brand-text-primary">Cost-down visibility</h3>
            <p className="leading-relaxed text-brand-text-secondary">
              Track savings from accepted alternatives across every uploaded BOM.
            </p>
          </div>
        </div>
      </section>

      <div className="absolute inset-0 z-0 bg-gradient-to-br from-brand-blue/20 to-brand-dark" />
    </div>
  )
}
