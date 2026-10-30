import { describe, it, expect } from 'vitest'
import { buildPoolConfig } from '@/lib/database-config'

describe('buildPoolConfig', () => {
  it('does not use SSL on localhost', () => {
    const url = 'postgresql://u:p@localhost:5432/db'
    expect(buildPoolConfig(url)).toEqual({ connectionString: url })
  })

  it('encrypts remote connections and removes SSL params from the URL', () => {
    const config = buildPoolConfig('postgresql://u:p@db.example.com:5432/db?sslmode=require&pgbouncer=true')
    expect(config.ssl).toEqual({ rejectUnauthorized: false })
    expect(config.connectionString).not.toContain('sslmode')
    expect(config.connectionString).toContain('pgbouncer=true')
  })

  it('validates the server when a CA is provided', () => {
    const config = buildPoolConfig('postgresql://u:p@db.example.com:5432/db', 'line1\\nline2')
    expect(config.ssl).toEqual({ ca: 'line1\nline2', rejectUnauthorized: true })
  })
})
