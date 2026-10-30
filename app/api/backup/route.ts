import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exportDatabase } from '@/lib/backup'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  // O papel vem do banco: o token pode ser anterior à remoção do acesso de admin.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const date = new Date().toISOString().slice(0, 10)
  return new Response(exportDatabase(), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="gestor-financeiro-backup-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
