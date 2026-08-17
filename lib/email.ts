import { createTransport } from 'nodemailer'
import { Resend } from 'resend'

function buildHtml(code: string): string {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;padding:32px 16px">
      <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
        <div style="background:#10b981;padding:20px 24px">
          <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700">🐷 Gestor Financeiro</p>
        </div>
        <div style="padding:28px 24px">
          <h1 style="margin:0 0 12px;font-size:20px;color:#18181b">Confirme seu e-mail</h1>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#52525b">
            Use o código abaixo para confirmar sua conta. Ele expira em 10 minutos.
          </p>
          <div style="background:#ecfdf5;border:1px dashed #10b981;border-radius:12px;padding:20px;text-align:center">
            <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#059669">${code}</span>
          </div>
          <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#a1a1aa">
            Se você não fez esse pedido, pode ignorar este e-mail.
          </p>
        </div>
      </div>
    </div>
  `
}

function buildResetHtml(code: string): string {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;padding:32px 16px">
      <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
        <div style="background:#10b981;padding:20px 24px">
          <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700">🐷 Gestor Financeiro</p>
        </div>
        <div style="padding:28px 24px">
          <h1 style="margin:0 0 12px;font-size:20px;color:#18181b">Redefinição de senha</h1>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#52525b">
            Use o código abaixo para criar uma nova senha. Ele expira em 10 minutos.
          </p>
          <div style="background:#ecfdf5;border:1px dashed #10b981;border-radius:12px;padding:20px;text-align:center">
            <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#059669">${code}</span>
          </div>
          <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#a1a1aa">
            Se você não pediu para redefinir a senha, pode ignorar este e-mail.
          </p>
        </div>
      </div>
    </div>
  `
}

async function sendViaSmtp(to: string, code: string): Promise<void> {
  const transporter = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: String(process.env.SMTP_PORT ?? '465') === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const from =
    process.env.EMAIL_FROM ??
    `Gestor Financeiro <${process.env.SMTP_USER}>`

  await transporter.sendMail({
    from,
    to,
    subject: 'Seu código de confirmação',
    html: buildHtml(code),
  })
}

async function sendViaResend(to: string, code: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY as string)
  const from = process.env.EMAIL_FROM ?? 'Gestor Financeiro <onboarding@resend.dev>'

  const { error } = await resend.emails.send({
    from,
    to,
    subject: 'Seu código de confirmação',
    html: buildHtml(code),
  })

  if (error) {
    throw new Error(`Falha ao enviar o e-mail (Resend): ${error.message}`)
  }
}

export async function sendVerificationCode(to: string, code: string): Promise<void> {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await sendViaSmtp(to, code)
      return
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      throw new Error(`Falha ao enviar o e-mail (SMTP): ${message}`)
    }
  }

  if (process.env.RESEND_API_KEY) {
    await sendViaResend(to, code)
    return
  }

  console.log(`[email-dev] Código de verificação para ${to}: ${code}`)
}

export async function sendPasswordResetCode(to: string, code: string): Promise<void> {
  const subject = 'Redefinição de senha'
  const html = buildResetHtml(code)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      await sendViaSmtpRaw(to, subject, html)
      return
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      throw new Error(`Falha ao enviar o e-mail (SMTP): ${message}`)
    }
  }
  if (process.env.RESEND_API_KEY) {
    await sendViaResendRaw(to, subject, html)
    return
  }
  console.log(`[email-dev] Código de redefinição de senha para ${to}: ${code}`)
}

async function sendViaSmtpRaw(to: string, subject: string, html: string): Promise<void> {
  const transporter = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: String(process.env.SMTP_PORT ?? '465') === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  const from = process.env.EMAIL_FROM ?? `Gestor Financeiro <${process.env.SMTP_USER}>`
  await transporter.sendMail({ from, to, subject, html })
}

async function sendViaResendRaw(to: string, subject: string, html: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY as string)
  const from = process.env.EMAIL_FROM ?? 'Gestor Financeiro <onboarding@resend.dev>'
  const { error } = await resend.emails.send({ from, to, subject, html })
  if (error) {
    throw new Error(`Falha ao enviar o e-mail (Resend): ${error.message}`)
  }
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 465),
        secure: String(process.env.SMTP_PORT ?? '465') === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
      const from =
        process.env.EMAIL_FROM ?? `Gestor Financeiro <${process.env.SMTP_USER}>`
      await transporter.sendMail({ from, to, subject, html })
      return
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      throw new Error(`Falha ao enviar o e-mail (SMTP): ${message}`)
    }
  }

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const from = process.env.EMAIL_FROM ?? 'Gestor Financeiro <onboarding@resend.dev>'
    const { error } = await resend.emails.send({ from, to, subject, html })
    if (error) {
      throw new Error(`Falha ao enviar o e-mail (Resend): ${error.message}`)
    }
    return
  }

  console.log(`[email-dev] Para ${to}: ${subject}`)
}
