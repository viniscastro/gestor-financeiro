import DOMPurify from 'isomorphic-dompurify'

export function sanitize(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj }
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      ;(result as Record<string, unknown>)[key] = sanitize(result[key] as string)
    }
  }
  return result
}
