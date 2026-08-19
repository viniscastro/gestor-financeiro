import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import VerifyEmailForm from '@/components/verify-email-form'

export const dynamic = 'force-dynamic'

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>
}) {
  const session = await auth()
  const params = await searchParams
  const email = Array.isArray(params.email) ? params.email[0] : (params.email ?? '')

  if (session?.user?.id && email) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true },
    })
    if (user?.emailVerified) redirect('/dashboard')
  } else if (session?.user?.id && !email) {
    redirect('/dashboard')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at top left, rgba(16,185,129,0.15), transparent 50%), radial-gradient(ellipse at bottom right, rgba(139,92,246,0.12), transparent 50%)',
        }}
      />
      <div className="relative">
        <VerifyEmailForm initialEmail={email} isLoggedIn={Boolean(session?.user?.id)} />
      </div>
    </div>
  )
}
