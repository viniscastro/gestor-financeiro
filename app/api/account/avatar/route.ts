import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DATA_URL_RE = /^data:image\/(jpeg|png|webp|gif);base64,/
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const image =
    typeof body === 'object' &&
    body !== null &&
    'image' in body &&
    (body as { image?: unknown }).image != null
      ? String((body as { image?: unknown }).image)
      : null

  if (image !== null) {
    if (image.length > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'Imagem muito grande' }, { status: 400 })
    }
    const match = image.match(DATA_URL_RE)
    if (!match) {
      return NextResponse.json({ error: 'Formato de imagem inválido' }, { status: 400 })
    }
    const base64 = image.slice(image.indexOf(',') + 1)
    const approxBytes = Math.floor((base64.length * 3) / 4)
    if (approxBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Imagem muito grande (máx. 2 MB)' }, { status: 400 })
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image },
  })

  return NextResponse.json({ ok: true })
}
