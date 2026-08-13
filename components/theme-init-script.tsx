'use client'

import { useServerInsertedHTML } from 'next/navigation'

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('gf-theme');var dark=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function ThemeInitScript() {
  useServerInsertedHTML(() => (
    <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
  ))
  return null
}
