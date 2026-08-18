import { exec } from 'child_process'
import { promisify } from 'util'
import { mkdir, readdir, stat, unlink } from 'fs/promises'
import { join } from 'path'

const execAsync = promisify(exec)

const BACKUP_DIR = join(process.cwd(), 'backups')
const MAX_BACKUPS = 7

function parseDatabaseUrl(url: string) {
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: parsed.port || '5432',
    database: parsed.pathname.slice(1),
    user: parsed.username,
    password: parsed.password,
  }
}

export async function createBackup(): Promise<string> {
  await mkdir(BACKUP_DIR, { recursive: true })

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error('DATABASE_URL não definida')

  const db = parseDatabaseUrl(dbUrl)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `backup_${timestamp}.sql.gz`
  const filepath = join(BACKUP_DIR, filename)

  const env = { ...process.env, PGPASSWORD: db.password }

  await execAsync(
    `pg_dump -h ${db.host} -p ${db.port} -U ${db.user} -d ${db.database} --no-owner --no-acl | gzip > "${filepath}"`,
    { env, timeout: 60_000 }
  )

  await cleanupOldBackups()

  return filepath
}

async function cleanupOldBackups() {
  try {
    const files = await readdir(BACKUP_DIR)
    const sqlFiles = files
      .filter((f) => f.startsWith('backup_') && f.endsWith('.sql.gz'))
      .sort()
      .reverse()

    for (const file of sqlFiles.slice(MAX_BACKUPS)) {
      await unlink(join(BACKUP_DIR, file))
    }
  } catch {
    // ignore cleanup errors
  }
}

export async function listBackups(): Promise<{ name: string; size: number }[]> {
  try {
    const files = await readdir(BACKUP_DIR)
    const results: { name: string; size: number }[] = []

    for (const file of files) {
      if (file.startsWith('backup_') && file.endsWith('.sql.gz')) {
        const stats = await stat(join(BACKUP_DIR, file))
        results.push({ name: file, size: stats.size })
      }
    }

    return results.sort((a, b) => b.name.localeCompare(a.name))
  } catch {
    return []
  }
}
