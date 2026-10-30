import { NextRequest, NextResponse } from 'next/server'
import { handlers } from '@/lib/auth'
import { withRateLimit, RATE_LIMITS } from '@/lib/with-rate-limit'

export const { GET } = handlers

export async function POST(request: NextRequest) {
  if (request.nextUrl.pathname.endsWith('/callback/credentials')) {
    const limited = withRateLimit(request, RATE_LIMITS.auth, 'login')
    if (limited) {
      // signIn() do cliente lê o resultado do campo "url" da resposta.
      const url = new URL('/login?error=CredentialsSignin&code=rate_limited', request.nextUrl.origin)
      return NextResponse.json({ url: url.href })
    }
  }
  return handlers.POST(request)
}
