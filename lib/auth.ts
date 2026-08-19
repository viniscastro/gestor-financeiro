import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ensureDefaultData } from '@/lib/defaults'
import { generateVerificationCode, storeVerificationCode } from '@/lib/verification'
import { sendVerificationCode } from '@/lib/email'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

class EmailNotVerified extends CredentialsSignin {
  code = 'email_not_verified'
}

const googleProvider =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          checks: [],
        }),
      ]
    : []

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        })
        if (!user) return null

        if (!user.emailVerified) {
          throw new EmailNotVerified()
        }

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return null

        return { id: user.id, name: user.name, email: user.email }
      },
    }),
    ...googleProvider,
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user?.email) {
        if (account.provider === 'google') {
          const email = user.email.toLowerCase()
          const dbUser = await prisma.user.findUnique({ where: { email } })

          if (!dbUser || !dbUser.password) {
            console.log(`[auth] Google login blocked for ${email}: no prior registration`)
            return token
          }

          if (!dbUser.emailVerified) {
            try {
              const code = generateVerificationCode()
              await storeVerificationCode(dbUser.id, code)
              await sendVerificationCode(email, code)
            } catch (err) {
              console.error('[google-verify] Failed to send verification email:', err)
            }
          }

          token.id = dbUser.id
        } else {
          token.id = user.id
        }
      }
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      return session
    },
  },
})
