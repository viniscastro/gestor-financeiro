import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Endpoint temporário de diagnóstico. Só responde quando DIAG_SECRET estiver
// configurado no ambiente e for enviado em ?secret=...
export async function GET(request: NextRequest) {
  const expected = process.env.DIAG_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const provided = request.nextUrl.searchParams.get('secret')
  if (provided !== expected) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const env = {
    nodeEnv: process.env.NODE_ENV ?? null,
    vercel: process.env.VERCEL ?? null,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasAuthUrl: !!process.env.AUTH_URL,
    hasAuthTrustHost: !!process.env.AUTH_TRUST_HOST,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    databaseHost: (() => {
      try {
        return new URL(process.env.DATABASE_URL ?? '').hostname
      } catch {
        return null
      }
    })(),
    hasResend: !!process.env.RESEND_API_KEY,
    hasSmtp: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    hasEmailFrom: !!process.env.EMAIL_FROM,
  }

  try {
    const [users, tables] = await Promise.all([
      prisma.user.count(),
      prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'User'
      `,
    ])
    return NextResponse.json({
      ok: true,
      db: { connected: true, userCount: users, userTable: tables.length > 0 },
      env,
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        db: {
          connected: false,
          error: err instanceof Error ? err.message : String(err),
        },
        env,
      },
      { status: 500 }
    )
  }
}
