import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDateLong } from '@/lib/format'
import AvatarUpload from '@/components/avatar-upload'
import DeleteAccountForm from '@/components/delete-account-form'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  let user: {
    name: string | null
    email: string
    image: string | null
    emailVerified: Date | null
    createdAt: Date
    password: string | null
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
      },
    })
  } catch (err) {
    console.error('[account] prisma error:', err)
  }
  if (!user) redirect('/')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Minha conta</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Gerencie suas informações de acesso
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800/50">
        <div className="flex flex-wrap items-center gap-5">
          <AvatarUpload name={user.name ?? ''} image={user.image} />
          <div className="min-w-0">
            <p className="text-base font-semibold text-zinc-900 dark:text-white">
              {user.name}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 border-t border-zinc-200 pt-4 text-sm sm:grid-cols-2 dark:border-zinc-700">
          <div>
            <dt className="text-zinc-500">E-mail confirmado</dt>
            <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">
              {user.emailVerified ? 'Sim' : 'Não'}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Conta criada em</dt>
            <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">
              {formatDateLong(user.createdAt)}
            </dd>
          </div>
        </dl>
      </div>

      <DeleteAccountForm email={user.email} />
    </div>
  )
}
