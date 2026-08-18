import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'

type ApiHandler = (
  request: NextRequest,
  ctx?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>

export function withSentry(handler: ApiHandler): ApiHandler {
  return async (request, ctx) => {
    try {
      return await handler(request, ctx)
    } catch (error) {
      Sentry.captureException(error)
      console.error('[API Error]', error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }
  }
}
