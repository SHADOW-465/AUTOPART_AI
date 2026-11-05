import { Logo } from "@/components/seion/logo"

/** Centered card used by the public pages: login, invite acceptance and 403. */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-dark px-4 py-16">
      <main className="w-full max-w-md rounded-xl border border-brand-border bg-white p-8 shadow-bevel">
        <Logo className="mb-8" />
        {children}
      </main>
    </div>
  )
}
