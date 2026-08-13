import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Sidebar from '@/components/sidebar'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/')

  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar
        user={{
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
        }}
      />
      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto max-w-5xl p-6 pt-20 lg:pt-10">{children}</div>
      </main>
    </div>
  )
}
