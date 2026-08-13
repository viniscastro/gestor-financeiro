'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { LoaderCircle, LogOut } from 'lucide-react'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    await signOut({ redirectTo: '/' })
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      title="Sair da conta"
      className="fixed right-16 top-4 z-40 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 shadow-sm transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-rose-400"
    >
      {loading ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      Sair
    </button>
  )
}
