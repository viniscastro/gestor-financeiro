'use client'

import { useServerInsertedHTML } from 'next/navigation'

interface Props {
  theme: string
  dashboardCards: string | null
}

export default function ServerPreferencesScript({ theme, dashboardCards }: Props) {
  useServerInsertedHTML(() => {
    const dark = theme === 'dark'
    const classes = dark ? ' class="dark"' : ''
    const htmlAttrs = dark ? ' data-theme="dark"' : ''
    const cardsScript = dashboardCards
      ? `<script>window.__GF_CARDS__=${dashboardCards}</script>`
      : ''

    return (
      <>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){document.documentElement.classList.toggle('dark',${dark});window.__GF_THEME__='${theme}';})()`,
          }}
        />
        {cardsScript}
      </>
    )
  })

  return null
}
