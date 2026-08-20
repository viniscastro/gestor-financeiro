import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function ServerPreferencesScript() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { theme: true, dashboardCards: true },
  })
  if (!user) return null

  const dark = user.theme === 'dark'
  const cardsJson = user.dashboardCards ?? 'null'

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){document.documentElement.classList.toggle('dark',${dark});window.__GF_THEME__=${JSON.stringify(user.theme)};window.__GF_CARDS__=${cardsJson};})()`,
      }}
    />
  )
}
