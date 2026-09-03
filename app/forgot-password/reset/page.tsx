import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import ForgotPasswordResetForm from '@/components/forgot-password-reset-form'

export const dynamic = 'force-dynamic'

export default async function ForgotPasswordResetPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>
}) {
  const session = await auth()
  if (session?.user?.id) redirect('/dashboard')

  const params = await searchParams
  const email = Array.isArray(params.email) ? params.email[0] : (params.email ?? '')

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 app-backdrop-gradient" />
      <div className="relative">
        <ForgotPasswordResetForm initialEmail={email} />
      </div>
    </div>
  )
}
