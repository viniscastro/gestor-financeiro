'use client'

import { useServerInsertedHTML } from 'next/navigation'

export default function ServerPreferencesScript({
  theme,
  dashboardCards,
}: {
  theme: string
  dashboardCards: string | null
}) {
  useServerInsertedHTML(() => {
    const dark = theme === 'dark'
    const cardsJson = dashboardCards ?? 'null'
    return (
      <script
        key="gf-prefs"
        dangerouslySetInnerHTML={{
          __html: `(function(){document.documentElement.classList.toggle('dark',${dark});window.__GF_THEME__=${JSON.stringify(theme)};window.__GF_CARDS__=${cardsJson};})()`,
        }}
      />
    )
  })

  return null
}
