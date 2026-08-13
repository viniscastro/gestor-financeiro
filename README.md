<div align="center">

# 🐷 Gestor Financeiro

### Controle suas finanças pessoais de forma simples e elegante.

Uma aplicação web completa para gerenciar **entradas e saídas** de dinheiro, com autenticação segura, dashboard de resumo e gráficos estatísticos — tudo em **tempo real**, construída com Next.js e PostgreSQL.

![Next.js](https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js&logoColor=white)
![React 19](https://img.shields.io/badge/React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind%20CSS%204-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma%207-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![NextAuth.js](https://img.shields.io/badge/NextAuth.js-EB0000?style=for-the-badge&logo=nextauth&logoColor=white)

</div>

---

## ✨ Funcionalidades

- 🔐 **Autenticação completa** — cadastro e login com e-mail/senha, senha criptografada com **bcrypt** e sessão segura via **JWT**
- 💸 **Entradas e saídas no mesmo lugar** — cadastre receitas e despesas em uma única tela, escolhendo o tipo na hora
- 🏷️ **Categorias pré-definidas** — 5 categorias de receita e 8 de despesa, com cores e rótulos em português
- 📊 **Dashboard resumido** — saldo total, entradas e saídas do mês, e as 5 transações mais recentes
- 📈 **Estatísticas com gráficos** — evolução mensal dos últimos 6 meses (barras) e despesas por categoria (pizza), com **Recharts**
- 🎨 **Interface moderna** — tema escuro, responsiva (menu lateral que vira gaveta no mobile) e ícones **Lucide**
- 🛡️ **Proteção de rotas** — áreas privadas redirecionam para o login; APIs exigem sessão válida (401 sem cookie)
- 💱 **Valores em centavos** — o dinheiro é armazenado como inteiro (cents), sem problemas de ponto flutuante

## 🚀 Stack

| Camada          | Tecnologia                                             |
| --------------- | ------------------------------------------------------ |
| Framework       | [Next.js](https://nextjs.org) 16.3.0 (App Router + Turbopack) |
| Linguagem       | [TypeScript](https://www.typescriptlang.org) 5         |
| UI              | [Tailwind CSS](https://tailwindcss.com) 4 · [Lucide](https://lucide.dev) |
| Gráficos        | [Recharts](https://recharts.org) 3.10.1                |
| Banco de dados  | [PostgreSQL](https://www.postgresql.org) 17 · [Prisma](https://www.prisma.io) 7.9.1 (driver adapter `pg`) |
| Autenticação    | [NextAuth.js](https://next-auth.js.org) 5 (beta) · [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| Validação       | [Zod](https://zod.dev) 4                               |

## 🏗️ Estrutura do projeto

```
gestor-financeiro/
├── app/
│   ├── (app)/                  # Áreas protegidas (após login)
│   │   ├── dashboard/          #   Resumo financeiro
│   │   ├── transactions/       #   CRUD de entradas/saídas
│   │   ├── stats/              #   Gráficos e estatísticas
│   │   └── layout.tsx          #   Layout com sidebar
│   ├── (auth)/page.tsx         # Tela única de login + cadastro
│   ├── api/
│   │   ├── auth/[...nextauth]/ # Rotas do NextAuth
│   │   ├── register/           # Criação de usuário
│   │   └── transactions/       # Listar/criar · editar/excluir ([id])
│   └── layout.tsx · globals.css
├── components/                 # auth-form, sidebar, transaction-*, statistics-charts
├── lib/                        # auth, prisma, format, categories, transactions, types
├── prisma/
│   ├── migrations/             # Migrações versionadas (PostgreSQL)
│   └── schema.prisma           # Modelos User e Transaction
├── src/generated/prisma/       # Prisma Client gerado
├── types/                      # Augmentação de tipos do NextAuth
└── prisma.config.ts            # Configuração do Prisma 7
```

## 🗄️ Modelo de dados

```prisma
model User {
  id           String        @id @default(cuid())
  name         String
  email        String        @unique
  password     String        // hash bcrypt
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  transactions Transaction[]
}

model Transaction {
  id              String   @id @default(cuid())
  transactionType String   // "INCOME" | "EXPENSE"
  description     String
  amount          Int      // valor em centavos
  category        String
  date            DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, date])
}
```

> 💡 Os valores são salvos em **centavos** (inteiro). Ex.: R$ 1.200,00 → `120000`.

## 🔌 API

| Método | Rota                            | Descrição                            | Acesso |
| ------ | ------------------------------- | ------------------------------------ | ------ |
| POST   | `/api/register`                 | Cadastra um novo usuário             | Público |
| GET    | `/api/auth/session`             | Retorna a sessão atual               | Cookie |
| POST   | `/api/auth/callback/credentials`| Autentica e cria a sessão (CSRF)     | Público |
| GET    | `/api/transactions`             | Lista as transações do usuário       | 🔒 Auth |
| POST   | `/api/transactions`             | Cria uma transação                   | 🔒 Auth |
| PATCH  | `/api/transactions/[id]`        | Atualiza uma transação               | 🔒 Auth |
| DELETE | `/api/transactions/[id]`        | Exclui uma transação                 | 🔒 Auth |

## 🚦 Pré-requisitos

- [Node.js](https://nodejs.org) 20+ (testado com 22)
- [PostgreSQL](https://www.postgresql.org) 14+ rodando localmente (testado com 17)

## 🛠️ Rodando localmente

```bash
# 1. Instale as dependências
npm install

# 2. Configure as variáveis de ambiente
cp .env.example .env
```

Preencha o `.env`:

```env
DATABASE_URL="postgresql://SEU_USUARIO:SUA_SENHA@localhost:5432/gestor"
AUTH_SECRET="<gere um secret>"
AUTH_TRUST_HOST="true"
```

Para gerar um `AUTH_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

> ⚠️ Se a senha do banco contiver caracteres especiais (`#`, `$`, `@`...), ela deve ser **codificada na URL** (ex.: `#` → `%23`, `$` → `%24`).

```bash
# 3. Crie o banco de dados e aplique as migrações
npx prisma migrate dev

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse **http://localhost:3000** 🎉

### Modo produção

```bash
npm run build
npm start
```

## 📜 Scripts disponíveis

| Comando            | Descrição                              |
| ------------------ | -------------------------------------- |
| `npm run dev`      | Servidor de desenvolvimento (Turbopack) |
| `npm run build`    | Build de produção + checagem de tipos  |
| `npm start`        | Serve o build de produção              |
| `npm run lint`     | ESLint                                 |
| `npx prisma studio`| Visualizar/editar dados no navegador   |

## ☁️ Deploy (Vercel)

O projeto está pronto para deploy na [Vercel](https://vercel.com):

1. Suba o código para um repositório no GitHub e importe-o na Vercel
2. Use um PostgreSQL na nuvem (ex.: [Neon](https://neon.tech) ou [Supabase](https://supabase.com)) e obtenha a `DATABASE_URL`
3. Configure as variáveis de ambiente na Vercel: `DATABASE_URL` e `AUTH_SECRET` (e `AUTH_TRUST_HOST="true"`)
4. Rode as migrações no banco da nuvem:

```bash
npx prisma migrate deploy
```

5. Faça o deploy 🚀

## 🗺️ Próximas ideias

- [ ] Parcelamento e recorrência (mensal, semanal...)
- [ ] Metas de economia e orçamento por categoria
- [ ] Exportação para CSV
- [ ] Upload de comprovantes
- [ ] Modo claro/escuro

---

<div align="center">

Feito com 💚 para o **Gestor Financeiro** · Next.js · TypeScript · Tailwind · Prisma · PostgreSQL

</div>
