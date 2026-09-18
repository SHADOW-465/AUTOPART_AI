import { Zap } from "lucide-react"
import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-brand-dark font-sans">
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-brand-blue/20 to-brand-dark" />
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-xl border border-brand-border bg-white p-8 shadow-bevel">
          <div className="mb-8 flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-gray-200 to-gray-400 p-1.5">
              <Zap size={20} className="text-brand-blue" />
            </div>
            <div>
              <p className="text-lg font-bold leading-none text-brand-text-primary">SEION</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-blue">AutoPart AI</p>
            </div>
          </div>
          <h1 className="mb-1 text-2xl font-bold text-brand-text-primary">Sign in</h1>
          <p className="mb-6 text-sm text-brand-text-secondary">
            Invite-only access for plant users. Use the email and password from your invite.
          </p>
          <LoginForm />
        </div>
      </main>
    </div>
  )
}
