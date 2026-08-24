import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import AdminNotify from '@/components/admin-notify'

export const metadata: Metadata = {
  title: 'Admin | Gestor Financeiro',
}

export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['vinislad17@gmail.com']

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.id || !ADMIN_EMAILS.includes(session.user.email ?? '')) {
    redirect('/dashboard')
  }

  return <AdminNotify />
}
