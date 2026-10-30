import { NextRequest, NextResponse } from 'next/server'
import { handlers } from '@/lib/auth'
import { clientIp, RATE_LIMITS } from '@/lib/with-rate-limit'
import { consumeRateLimit } from '@/lib/persistent-rate-limit'

export const { GET } = handlers

async function isLoginAllowed(request: NextRequest) {
  const form = await request.clone().formData().catch(() => null)
  const email = String(form?.get('email') ?? '').trim().toLowerCase()

  const [ipOk, accountOk] = await Promise.all([
    consumeRateLimit(`login:${clientIp(request)}`, RATE_LIMITS.auth),
    email ? consumeRateLimit(`login-account:${email}`, RATE_LIMITS.account) : true,
  ])
  return ipOk && accountOk
}

export async function POST(request: NextRequest) {
  if (request.nextUrl.pathname.endsWith('/callback/credentials') && !(await isLoginAllowed(request))) {
    // signIn() do cliente lê o resultado do campo "url" da resposta.
    const url = new URL('/login?error=CredentialsSignin&code=rate_limited', request.nextUrl.origin)
    return NextResponse.json({ url: url.href })
  }
  return handlers.POST(request)
}
