import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { markBillPaid } from '@/lib/recurring'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { ruleId } = body as { ruleId?: string }
  if (!ruleId) {
    return NextResponse.json({ error: 'ruleId é obrigatório' }, { status: 400 })
  }

  const ok = await markBillPaid(session.user.id, ruleId)
  if (!ok) {
    return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
