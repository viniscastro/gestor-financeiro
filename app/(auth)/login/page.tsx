import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import AuthForm from '@/components/auth-form'
import AuthThemeToggle from '@/components/auth-theme-toggle'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams?: Promise<{ mode?: string | string[] }>
}

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth()
  if (session?.user?.id) redirect('/dashboard')

  const params = await searchParams
  const mode = Array.isArray(params?.mode) ? params.mode[0] : params?.mode

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-y-auto p-4">
      <div className="pointer-events-none absolute inset-0 app-backdrop-gradient" />
      <div className="absolute right-4 top-4 z-50">
        <AuthThemeToggle />
      </div>
      <div className="relative">
        <AuthForm key={mode ?? 'login'} initialMode={mode === 'register' ? 'register' : undefined} />
      </div>
    </div>
  )
}
