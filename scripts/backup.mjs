import 'dotenv/config'
import { createBackup } from '../lib/backup.ts'

async function main() {
  console.log(`[${new Date().toISOString()}] Iniciando backup...`)
  try {
    const filepath = await createBackup()
    console.log(`[${new Date().toISOString()}] Backup criado: ${filepath}`)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Erro no backup:`, error)
    process.exit(1)
  }
}

main()
