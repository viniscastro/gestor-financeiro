import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDateLong } from '@/lib/format'
import AvatarUpload from '@/components/avatar-upload'
import DeleteAccountForm from '@/components/delete-account-form'
import MonthlyReportToggle from '@/components/monthly-report-toggle'

export const metadata: Metadata = {
  title: 'Minha Conta | Gestor Financeiro',
}

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  let user: {
    name: string | null
    email: string
    image: string | null
    emailVerified: Date | null
    createdAt: Date
    password: string | null
    monthlyReport: boolean
  } | null = null
  try {
    user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        password: true,
        monthlyReport: true,
      },
    })
  } catch (err) {
    console.error('[account] prisma error:', err)
  }
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Minha conta</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gerencie suas informações de acesso
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-5">
          <AvatarUpload name={user.name ?? ''} image={user.image} />
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              {user.name}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 border-t border-slate-200 pt-4 text-sm sm:grid-cols-2 dark:border-slate-700">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">E-mail confirmado</dt>
            <dd className="mt-0.5 text-slate-700 dark:text-slate-200">
              {user.emailVerified ? 'Sim' : 'Não'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Conta criada em</dt>
            <dd className="mt-0.5 text-slate-700 dark:text-slate-200">
              {formatDateLong(user.createdAt)}
            </dd>
          </div>
        </dl>
      </div>

      <MonthlyReportToggle enabled={user.monthlyReport} />

      <DeleteAccountForm email={user.email} />
    </div>
  )
}
