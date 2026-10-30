const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const SSL_PARAMS = ['sslmode', 'sslcert', 'sslkey', 'sslrootcert', 'sslaccept', 'uselibpqcompat']

// O SSL fica restrito à conexão com o banco, sem precisar desligar a verificação
// de certificados do processo inteiro. Com DATABASE_CA_CERT o certificado do
// servidor é validado; sem ele a conexão é cifrada, mas não valida o servidor.
export function buildPoolConfig(connectionString: string, caCert?: string) {
  const url = new URL(connectionString)
  if (LOCAL_HOSTS.has(url.hostname)) return { connectionString }

  // Parâmetros de SSL na URL têm prioridade sobre a opção "ssl" no driver pg.
  for (const param of SSL_PARAMS) url.searchParams.delete(param)

  return {
    connectionString: url.toString(),
    ssl: caCert
      ? { ca: caCert.replace(/\\n/g, '\n'), rejectUnauthorized: true }
      : { rejectUnauthorized: false },
  }
}
