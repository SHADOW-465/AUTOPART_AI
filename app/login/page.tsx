import { AuthCard } from "@/components/seion/auth-card"
import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <AuthCard>
      <h1 className="mb-1 text-2xl font-bold text-brand-text-primary">Sign in</h1>
      <p className="mb-6 text-sm text-brand-text-secondary">
        Invite-only access for plant users. Use the email and password from your invite.
      </p>
      <LoginForm />
    </AuthCard>
  )
}
