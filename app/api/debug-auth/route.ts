import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body.email || '').toLowerCase()
    const password = String(body.password || '')

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ ok: false, reason: 'user_not_found' })
    }

    const valid = await bcrypt.compare(password, user.password)
    return NextResponse.json({
      ok: true,
      emailVerified: !!user.emailVerified,
      hasPassword: !!user.password,
      validPassword: valid,
      hashPrefix: user.password.slice(0, 10),
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const count = await prisma.user.count()
    return NextResponse.json({
      ok: true,
      dbConnected: true,
      userCount: count,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasAuthSecret: !!process.env.AUTH_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        hasResend: !!process.env.RESEND_API_KEY,
        hasSmtp: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
        vercel: !!process.env.VERCEL,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, dbConnected: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
