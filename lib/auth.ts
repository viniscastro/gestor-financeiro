import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ensureDefaultData } from '@/lib/defaults'

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
          let dbUser = await prisma.user.findUnique({ where: { email } })
          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                name: user.name ?? email.split('@')[0],
                email,
                password: '',
                image: user.image ?? null,
                emailVerified: new Date(),
              },
            })
            await ensureDefaultData(dbUser.id)
          } else if (!dbUser.emailVerified) {
            dbUser = await prisma.user.update({
              where: { id: dbUser.id },
              data: { emailVerified: new Date() },
            })
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
