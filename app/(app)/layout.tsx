import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { materializeRecurring, notifyUpcomingBills } from '@/lib/recurring'
import Sidebar from '@/components/sidebar'
import ServerPreferencesScript from '@/components/server-preferences-script'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  await materializeRecurring(session.user.id)
  await notifyUpcomingBills(session.user.id).catch((err) => {
    console.error('[notifyUpcomingBills]', err)
  })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, image: true, emailVerified: true, theme: true, dashboardCards: true },
  })
  if (!user) redirect('/')

  if (!user.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(user.email)}`)
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0e0e12]">
      <ServerPreferencesScript />
      <Sidebar user={user} />
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-16 pt-20 sm:px-6 sm:py-20 lg:px-6 lg:pt-10">{children}</div>
      </main>
    </div>
  )
}
