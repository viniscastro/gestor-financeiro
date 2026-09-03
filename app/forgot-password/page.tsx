import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import ForgotPasswordEmailForm from '@/components/forgot-password-email-form'

export const dynamic = 'force-dynamic'

export default async function ForgotPasswordPage() {
  const session = await auth()
  if (session?.user?.id) redirect('/dashboard')

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 app-backdrop-gradient" />
      <div className="relative">
        <ForgotPasswordEmailForm />
      </div>
    </div>
  )
}
