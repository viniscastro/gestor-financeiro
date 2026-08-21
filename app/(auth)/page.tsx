import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import AuthForm from '@/components/auth-form'
import AuthThemeToggle from '@/components/auth-theme-toggle'

export const dynamic = 'force-dynamic'

export default async function AuthPage() {
  const session = await auth()
  if (session?.user?.id) redirect('/dashboard')

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at top left, rgba(16,185,129,0.15), transparent 50%), radial-gradient(ellipse at bottom right, rgba(139,92,246,0.12), transparent 50%)',
        }}
      />
      <div className="absolute right-4 top-4 z-50">
        <AuthThemeToggle />
      </div>
      <div className="relative">
        <AuthForm />
      </div>
    </div>
  )
}
