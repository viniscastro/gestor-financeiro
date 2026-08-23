import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { notifyFeature } from '@/lib/notifications'

const ADMIN_EMAILS = ['vinislad17@gmail.com']

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id || !ADMIN_EMAILS.includes(session.user.email ?? '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { title, message, type } = body as { title?: string; message?: string; type?: string }

  if (!title?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: 'Título e mensagem são obrigatórios' },
      { status: 400 }
    )
  }

  const validTypes = ['FEATURE', 'BUG', 'SYSTEM']
  const notificationType = validTypes.includes(type ?? '') ? type! : 'FEATURE'

  await notifyFeature(title.trim(), message.trim(), notificationType)

  return NextResponse.json({ ok: true })
}
