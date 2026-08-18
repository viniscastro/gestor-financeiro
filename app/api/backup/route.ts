import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createBackup, listBackups } from '@/lib/backup'

const ADMIN_EMAILS = ['vinislad17@gmail.com']

export async function GET() {
  const session = await auth()
  if (!session?.user?.id || !ADMIN_EMAILS.includes(session.user.email ?? '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const backups = await listBackups()
  return NextResponse.json(backups)
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id || !ADMIN_EMAILS.includes(session.user.email ?? '')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  try {
    const filepath = await createBackup()
    return NextResponse.json({ ok: true, file: filepath })
  } catch (error) {
    console.error('[Backup Error]', error)
    return NextResponse.json({ error: 'Erro ao criar backup' }, { status: 500 })
  }
}
