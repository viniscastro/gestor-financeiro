'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

async function registerSW() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await navigator.serviceWorker.ready
    return reg
  } catch {
    return null
  }
}

async function subscribePush(reg: ServiceWorkerRegistration) {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidPublicKey) return null
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing
  try {
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
  } catch {
    return null
  }
}

async function saveSubscription(sub: PushSubscription) {
  const { endpoint, keys } = sub.toJSON()
  if (!endpoint || !keys) return
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth }),
  })
}

async function unsubscribePush(reg: ServiceWorkerRegistration) {
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    })
    await sub.unsubscribe()
  }
}

export default function PushToggle({ onAction }: { onAction?: () => void }) {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const regRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSupported(true)
    registerSW().then((reg) => {
      if (!reg) return
      regRef.current = reg
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub)
        setPermission(Notification.permission)
      })
    })
  }, [])

  async function toggle() {
    if (subscribed) {
      const reg = regRef.current
      if (reg) {
        await unsubscribePush(reg)
        setSubscribed(false)
      }
    } else {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') return
      let reg = regRef.current
      if (!reg) reg = await registerSW()
      if (!reg) return
      regRef.current = reg
      const sub = await subscribePush(reg)
      if (sub) {
        await saveSubscription(sub)
        setSubscribed(true)
      }
    }
    onAction?.()
  }

  if (!supported || permission === 'denied') return null

  const Icon = subscribed ? Bell : BellOff
  const label = subscribed ? 'Notificações ativas' : 'Ativar notificações'

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {label}
    </button>
  )
}
