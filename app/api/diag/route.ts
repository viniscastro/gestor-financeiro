import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const headers: Record<string, string> = {}
    request.headers.forEach((v, k) => {
      if (k.toLowerCase().includes('cookie') || k.toLowerCase().includes('host') || k.toLowerCase().includes('x-forward')) {
        headers[k] = v
      }
    })

    let user = null
    if (session?.user?.email) {
      user = await prisma.user.findUnique({
        where: { email: String(session.user.email).toLowerCase() },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          hasPassword: true,
          resetSentAt: true,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      hasSession: !!session?.user,
      sessionEmail: session?.user?.email ?? null,
      db: { connected: true },
      user,
      env: {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV,
        hasAuthSecret: !!process.env.AUTH_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        hasAuthUrl: !!process.env.AUTH_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasResend: !!process.env.RESEND_API_KEY,
        hasSmtp: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      },
      headers,
      url: request.url,
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5) : undefined,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body.email || '').toLowerCase()
    const password = String(body.password || '')

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ ok: false, reason: 'user_not_found' }, { status: 404 })
    }

    const valid = await bcrypt.compare(password, user.password)
    return NextResponse.json({
      ok: true,
      reason: valid ? 'password_ok' : 'password_invalid',
      emailVerified: !!user.emailVerified,
      hasPassword: !!user.password,
      hashPrefix: user.password.slice(0, 7),
      hashLen: user.password.length,
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}
