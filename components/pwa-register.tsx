'use client'

import { useEffect } from 'react'

async function registerSW() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {}
}

export default function PwaRegister() {
  useEffect(() => {
    registerSW()
  }, [])

  return null
}
