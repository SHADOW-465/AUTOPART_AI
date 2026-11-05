import Link from "next/link"
import { ClipboardCheck, FileSpreadsheet, ShieldCheck } from "lucide-react"
import { Logo } from "@/components/seion/logo"

const steps = [
  {
    icon: FileSpreadsheet,
    title: "Upload a BOM",
    body: "xlsx, csv or text-based PDF. Part lines and specs are extracted and normalised.",
  },
  {
    icon: ShieldCheck,
    title: "Match to Indian Standards",
    body: "DIN / ISO specs are mapped to IS equivalents from a curated table, not guessed by AI.",
  },
  {
    icon: ClipboardCheck,
    title: "Review and propose",
    body: "Quality checks the swap, procurement drafts the RFQ, and you export a change proposal for customer approval.",
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-dark">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between p-6">
        <Logo inverted />
        <Link
          href="/login"
          className="rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blueHover"
        >
          Sign in
        </Link>
      </nav>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
          Foreign-spec BOM in.
          <br />
          <span className="text-blue-300">BIS-compliant alternatives out.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-gray-300">
          For Tier-2 procurement and quality teams localizing OEM BOMs. Find the Indian Standard equivalent for each
          line, check it, and send a proposal your customer can approve.
        </p>

        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-white/10 bg-white/5 p-5">
              <step.icon className="mb-3 h-6 w-6 text-blue-300" />
              <p className="text-sm font-semibold text-white">
                {i + 1}. {step.title}
              </p>
              <p className="mt-1 text-sm text-gray-400">{step.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-sm text-gray-400">Access is invite-only. Ask your plant admin for an invite.</p>
      </main>
    </div>
  )
}
