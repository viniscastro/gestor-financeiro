<div align="center">

# 🐷 Gestor Financeiro

### Controle suas finanças pessoais de forma simples e elegante.

Uma aplicação web completa para gerenciar **entradas e saídas** de dinheiro, com **múltiplas contas e transferências**, orçamentos por categoria, lançamentos recorrentes, **metas de economia** e gráficos estatísticos — tudo em **tempo real**, construída com Next.js e PostgreSQL.

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
- ✉️ **Confirmação de e-mail** — código de 6 dígitos enviado por e-mail, com expiração de 10 min, reenvio com cooldown e bloqueio de login até a conta ser verificada
- 🔑 **Redefinição de senha** — fluxo em 3 telas (`/forgot-password` → código → nova senha), com cooldown no reenvio, expiração em 10 min e anti-enumeração (retorna `200` mesmo se o e-mail não existir)
- 👁️ **Mostrar/ocultar senha** — toggle com ícone de olho nos campos de senha (login, cadastro e redefinição)
- 💼 **Multi-contas** — crie contas de qualquer tipo (Carteira, Investimento, Poupança...) com saldo inicial e cor própria; o saldo é calculado automaticamente
- 🔁 **Transferências entre contas** — mova dinheiro entre contas: as duas pernas (saída/entrada) são criadas vinculadas e excluídas juntas
- 💸 **Entradas e saídas no mesmo lugar** — cadastre receitas e despesas em uma única tela, escolhendo o tipo, a conta e a categoria na hora
- 🏷️ **Categorias gerenciáveis** — 13 categorias padrão (5 de receita e 8 de despesa) com cores e ícones; crie novas categorias e exclua as que não usa pela tela de Categorias
- 🎯 **Orçamentos mensais por categoria** — defina um limite por categoria e acompanhe o gasto do mês com barra de progresso e alerta visual ao se aproximar/estourar
- 📆 **Lançamentos recorrentes** — transações automáticas mensais (dia do mês), com ativação/desativação, lembrete por e-mail com dias de antecedência, **arrastar para reordenar** e **desfazer exclusão**
- 🏦 **Metas de economia** — defina objetivos (viagem, reserva...) com valor alvo e data; acompanhe o progresso pelo valor guardado
- 🏷️ **Gerenciamento de categorias** — crie, **edite** e exclua categorias de entrada e saída, com cores e ícones customizáveis; 13 categorias padrão incluídas
- 📤 **Exportar CSV** — exporte as transações (respeitando os filtros ativos) e um relatório de estatísticas (mensal + por categoria) em CSV pronto para Excel
- 📊 **Dashboard resumido** — saldo total, entradas/saídas do mês, guardado em metas, total de recorrentes, top categorias com barra de progresso, status dos orçamentos e transações mais recentes
- 🔍 **Filtros avançados** — busque por texto, filtre por tipo, conta, categoria, mês ou **período personalizado** (data início/fim) nas transações
- 📈 **Estatísticas com gráficos** — evolução mensal dos últimos 6 meses (barras) e despesas por categoria (pizza), com **Recharts**
- 🎨 **Interface moderna** — temas **claro, escuro e automático** (detecta preferência do SO) com alternância cíclica, responsiva (menu lateral que vira gaveta no mobile) e ícones **Lucide**
- 🖼️ **Foto de perfil** — envie uma imagem (redimensionada no cliente) ou remova, exibida na sidebar e na página de conta
- 🗑️ **Exclusão com desfazer** — ao excluir qualquer item (transação, conta, categoria, meta, orçamento, recorrência), um toast aparece com botão "Desfazer" para recriar o item
- 📱 **PWA instalável** — manifest, ícones 192/512/maskable, theme-color dinâmico (claro/escuro) e suporte a iOS (apple-touch-icon); instale o app no celular/desktop como atalho de tela cheia
- 🛡️ **Proteção de rotas** — áreas privadas redirecionam para o login; APIs exigem sessão válida (401 sem cookie)
- 💱 **Valores em centavos** — o dinheiro é armazenado como inteiro (cents), sem problemas de ponto flutuante

## 🛡️ Segurança & Operação

- ⏱️ **Rate limiting** — limite de requisições por IP em todas as API routes (auth: 10/15min, API: 120/min)
- 🧹 **Sanitização de inputs** — proteção contra XSS via DOMPurify em todos os campos de texto
- 🐛 **Monitoramento de erros** — Sentry captura erros em produção com stack trace e contexto (configuração via `SENTRY_DSN`)
- 🧪 **Testes automatizados** — 24 testes com Vitest cobrindo rate limiter, sanitização, formatação e lógica de recorrência
- 💾 **Backup automático** — script de backup com `pg_dump` + compressão gzip, retenção de 7 backups, acessível via API ou `npm run backup`

## 🚀 Stack

| Camada          | Tecnologia                                             |
| --------------- | ------------------------------------------------------ |
| Framework       | [Next.js](https://nextjs.org) 16.3.0 (App Router + Turbopack) |
| Linguagem       | [TypeScript](https://www.typescriptlang.org) 5         |
| UI              | [Tailwind CSS](https://tailwindcss.com) 4 · [Lucide](https://lucide.dev) |
| Gráficos        | [Recharts](https://recharts.org) 3.10.1                |
| Banco de dados  | [PostgreSQL](https://www.postgresql.org) 17 · [Prisma](https://www.prisma.io) 7.9.1 (driver adapter `pg`) |
| Autenticação    | [NextAuth.js](https://next-auth.js.org) 5 (beta) · [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| E-mails         | [Nodemailer](https://nodemailer.com) (SMTP/Gmail) · [Resend](https://resend.com) |
| Validação       | [Zod](https://zod.dev) 4                               |
| Notificações    | [Sonner](https://sonner.sh) (toast com undo)           |
| Segurança       | [DOMPurify](https://github.com/cure53/DOMPurify) (sanitização XSS) |
| Monitoramento   | [Sentry](https://sentry.io) (logging de erros)         |
| Testes          | [Vitest](https://vitest.dev) 4.1                       |

## 🏗️ Estrutura do projeto

```
gestor-financeiro/
├── app/
│   ├── (app)/                  # Áreas protegidas (após login)
│   │   ├── dashboard/          #   Resumo financeiro
│   │   ├── transactions/       #   Entradas/saídas (busca + filtros + exportar CSV)
│   │   ├── accounts/           #   Multi-contas e transferências
│   │   ├── budgets/            #   Orçamentos mensais por categoria
│   │   ├── categories/         #   Gerenciar categorias (criar/excluir)
│   │   ├── recurring/          #   Lançamentos recorrentes (arrastar p/ reordenar)
│   │   ├── goals/              #   Metas de economia
│   │   ├── stats/              #   Gráficos e estatísticas
│   │   ├── account/            #   Conta (foto, tema, excluir)
│   │   └── layout.tsx          #   Layout com sidebar
│   ├── (auth)/page.tsx         # Tela única de login + cadastro
│   ├── verify-email/page.tsx   # Confirmação de e-mail com código
│   ├── forgot-password/        # Redefinição de senha (3 telas):
│   │   ├── page.tsx            #   Tela 1 — informar e-mail
│   │   ├── verify/page.tsx     #   Tela 2 — digitar código de verificação
│   │   └── reset/page.tsx      #   Tela 3 — definir nova senha
│   ├── api/                    # Rotas: auth, register, verify-email, resend-verification,
│   │                           # forgot-password, verify-reset-code, reset-password,
│   │                           # transactions, transfers, accounts, categories, budgets,
│   │                           # recurring, goals, account (avatar), backup
│   └── layout.tsx · globals.css
├── __tests__/                  # Testes automatizados (Vitest)
│   ├── rate-limit.test.ts
│   ├── sanitize.test.ts
│   ├── format.test.ts
│   └── recurring.test.ts
├── components/                 # managers de cada módulo, forms, sidebar, statistics-charts...
├── lib/                        # auth, backup, email, prisma, rate-limit, sanitize,
│                               # validation (zod), with-rate-limit, with-sentry, helpers
├── prisma/
│   ├── migrations/             # Migrações versionadas (PostgreSQL)
│   └── schema.prisma           # Modelos do banco
├── sentry.*.config.ts          # Configurações do Sentry (client, server, edge)
├── src/generated/prisma/       # Prisma Client gerado
├── types/                      # Augmentação de tipos do NextAuth
├── vitest.config.ts            # Configuração dos testes
└── prisma.config.ts            # Configuração do Prisma 7
```

## 🗄️ Modelo de dados

```prisma
model User {
  id                   String         @id @default(cuid())
  name                 String
  email                String         @unique
  password             String         // hash bcrypt (vazio para contas Google)
  image                String?
  emailVerified        DateTime?
  verificationCode     String?        // hash bcrypt do código de confirmação
  verificationExpires  DateTime?
  verificationSentAt   DateTime?
  resetCode            String?        // hash bcrypt do código de redefinição
  resetExpires         DateTime?
  resetSentAt          DateTime?
  accounts             Account[]
  categories           Category[]
  budgets              Budget[]
  recurringRules       RecurringRule[]
  goals                SavingsGoal[]
  transactions         Transaction[]
}

model Account {
  id             String         @id @default(cuid())
  userId         String
  name           String
  type           String         @default("CARTEIRA")  // CARTEIRA | INVESTIMENTO | ...
  color          String         @default("#10b981")
  initialBalance Int            @default(0)           // centavos
  transactions   Transaction[]
  recurringRules RecurringRule[] @relation("RecurringFromAccount")
  recurringIncoming RecurringRule[] @relation("RecurringToAccount")
  goals          SavingsGoal[]
}

model Category {
  id       String   @id @default(cuid())
  userId   String
  name     String
  type     String   // INCOME | EXPENSE
  color    String   @default("#78716c")
  icon     String   @default("tag")
  budgets  Budget[]
  recurringRules RecurringRule[]
  @@unique([userId, name, type])
}

model Budget {
  id          String   @id @default(cuid())
  userId      String
  categoryId  String
  amountCents Int
  @@unique([userId, categoryId])   // um orçamento por categoria
}

model RecurringRule {
  id                    String    @id @default(cuid())
  userId                String
  description           String
  amountCents           Int
  kind                  String    @default("TRANSACTION") // TRANSACTION | TRANSFER
  type                  String    // INCOME | EXPENSE (para TRANSACTION)
  categoryId            String?
  accountId             String    // conta de origem
  toAccountId           String?   // conta de destino (kind = TRANSFER)
  dayOfMonth            Int
  active                Boolean   @default(true)
  notifyDaysBefore      Int       @default(3)
  lastNotifiedAt        DateTime?
  lastMaterializedMonth String?   // controla materialização (anti-duplicação)
  position              Int       @default(0) // ordem de exibição (drag-and-drop)
}

model Transaction {
  id              String         @id @default(cuid())
  transactionType String         // INCOME | EXPENSE
  description     String
  amount          Int            // centavos
  date            DateTime
  accountId       String
  categoryId      String?
  transferGroupId String?        // vincula as duas pernas de uma transferência
  recurringId     String?
  occurrenceMonth String?        // "YYYY-MM" (materialização de recorrente)
}

model SavingsGoal {
  id            String   @id @default(cuid())
  userId        String
  name          String
  targetAmount  Int      // centavos
  currentAmount Int      @default(0)   // usado quando não há conta vinculada
  accountId     String?               // se vinculada, progresso = saldo da conta
  targetDate    DateTime?
}
```

> 💡 Os valores são salvos em **centavos** (inteiro). Ex.: R$ 1.200,00 → `120000`.

## 🔌 API

| Método | Rota                             | Descrição                                          | Acesso |
| ------ | -------------------------------- | -------------------------------------------------- | ------ |
| POST   | `/api/register`                  | Cadastra um novo usuário e envia o código de confirmação | Público |
| POST   | `/api/verify-email`              | Valida o código e confirma o e-mail                 | Público |
| POST   | `/api/resend-verification`       | Reenvia o código (cooldown de 60s)                  | Público |
| POST   | `/api/forgot-password`           | Envia código de redefinição (cooldown 60s, anti-enumeração) | Público |
| POST   | `/api/verify-reset-code`         | Valida código de redefinição sem consumir            | Público |
| POST   | `/api/reset-password`            | Redefine a senha com código e nova senha             | Público |
| GET    | `/api/auth/session`              | Retorna a sessão atual                              | Cookie |
| POST   | `/api/auth/callback/credentials` | Autentica e cria a sessão (CSRF)                    | Público |
| GET    | `/api/transactions`              | Lista as transações (filtros `accountId`/`categoryId` via query) | 🔒 Auth |
| POST   | `/api/transactions`              | Cria uma transação (aceita `recurringId` e `occurrenceMonth`) | 🔒 Auth |
| PATCH  | `/api/transactions/[id]`         | Atualiza uma transação                              | 🔒 Auth |
| DELETE | `/api/transactions/[id]`         | Exclui uma transação                                | 🔒 Auth |
| POST   | `/api/transfers`                 | Cria uma transferência (par de transações)          | 🔒 Auth |
| GET    | `/api/accounts`                  | Lista contas (com saldo calculado)                  | 🔒 Auth |
| POST   | `/api/accounts`                  | Cria uma conta                                      | 🔒 Auth |
| PATCH  | `/api/accounts/[id]`             | Edita uma conta                                     | 🔒 Auth |
| DELETE | `/api/accounts/[id]`             | Exclui uma conta (bloqueada se houver transações)   | 🔒 Auth |
| GET    | `/api/categories`                | Lista categorias (alfabético, "Outros" por último)  | 🔒 Auth |
| POST   | `/api/categories`                | Cria uma categoria                                  | 🔒 Auth |
| PATCH  | `/api/categories/[id]`           | Edita uma categoria                                 | 🔒 Auth |
| DELETE | `/api/categories/[id]`           | Exclui uma categoria                                | 🔒 Auth |
| GET    | `/api/budgets`                   | Lista orçamentos (com gasto do mês)                 | 🔒 Auth |
| POST   | `/api/budgets`                   | Cria um orçamento por categoria                     | 🔒 Auth |
| PATCH  | `/api/budgets/[id]`              | Atualiza o valor                                    | 🔒 Auth |
| DELETE | `/api/budgets/[id]`              | Exclui um orçamento                                 | 🔒 Auth |
| GET    | `/api/recurring`                 | Lista recorrentes (materializa o mês corrente)      | 🔒 Auth |
| POST   | `/api/recurring`                 | Cria uma recorrência (transação)                   | 🔒 Auth |
| PATCH  | `/api/recurring`                 | Reordena recorrências (envia `ids[]` na ordem desejada) | 🔒 Auth |
| PATCH  | `/api/recurring/[id]`            | Edita uma recorrência                               | 🔒 Auth |
| DELETE | `/api/recurring/[id]`            | Exclui uma recorrência                              | 🔒 Auth |
| GET    | `/api/goals`                     | Lista metas (com progresso)                         | 🔒 Auth |
| POST   | `/api/goals`                     | Cria uma meta de economia                           | 🔒 Auth |
| PATCH  | `/api/goals/[id]`                | Edita uma meta                                      | 🔒 Auth |
| DELETE | `/api/goals/[id]`                | Exclui uma meta                                     | 🔒 Auth |
| PATCH  | `/api/account/avatar`            | Atualiza a foto de perfil                           | 🔒 Auth |
| DELETE | `/api/account`                   | Exclui a conta do usuário (requer senha)            | 🔒 Auth |
| GET    | `/api/backup`                    | Lista backups (admin)                               | 🔒 Admin |
| POST   | `/api/backup`                    | Cria um backup manual do banco (admin)              | 🔒 Admin |

> 🔒 **Rate limiting aplicado em todas as rotas públicas** (auth: 10 req/15min) **e autenticadas** (API: 120 req/min).

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
# Envio de e-mails — use SMTP (Gmail) OU Resend. SMTP tem prioridade.
EMAIL_FROM="Gestor Financeiro <seuemail@gmail.com>"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="seuemail@gmail.com"
SMTP_PASS="<senha de app do Gmail>"
RESEND_API_KEY="<sua api key do Resend>"
GOOGLE_CLIENT_ID="<seu google client id>"
GOOGLE_CLIENT_SECRET="<seu google client secret>"
SENTRY_DSN="<seu dsn do sentry (opcional)>"
```

Para gerar um `AUTH_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

> ⚠️ Se a senha do banco contiver caracteres especiais (`#`, `$`, `@`...), ela deve ser **codificada na URL** (ex.: `#` → `%23`, `$` → `%24`).

> 💡 Sem SMTP/Resend configurados, o código de confirmação é exibido no **console do servidor** (útil em desenvolvimento). Sem `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, o botão "Entrar com Google" simplesmente não aparece. Sem `SENTRY_DSN`, o Sentry fica desligado.

```bash
# 3. Crie o banco de dados e aplique as migrações
npx prisma migrate dev

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse **https://localhost:3000** 🎉

> 🔒 **HTTPS em desenvolvimento:** o navegador Brave (e outros com "forçar HTTPS" ativo) bloqueia o `http://localhost` em dev. O projeto usa um certificado local confiável (via [mkcert](https://github.com/FiloSottile/mkcert)) para rodar o servidor em HTTPS. Certificados já configurados em `.certs/` (ignorados pelo git). Para regenerar em outra máquina:
>
> ```bash
> winget install FiloSottile.mkcert
> mkcert -install
> mkdir .certs
> mkcert -cert-file .certs/localhost.pem -key-file .certs/localhost-key.pem localhost 127.0.0.1 ::1
> ```

### Modo produção

```bash
npm run build
npm start
```

## 📜 Scripts disponíveis

| Comando            | Descrição                              |
| ------------------ | -------------------------------------- |
| `npm run dev`      | Servidor de desenvolvimento HTTP (Turbopack) |
| `npm run dev:https`| Servidor de desenvolvimento HTTPS (certificado `.certs/`) |
| `npm run build`    | Build de produção + checagem de tipos  |
| `npm start`        | Serve o build de produção              |
| `npm run lint`     | ESLint                                 |
| `npm test`         | Executa os testes (Vitest)             |
| `npm run test:watch`| Executa os testes em modo watch       |
| `npm run backup`   | Cria um backup manual do banco de dados |
| `npx prisma studio`| Visualizar/editar dados no navegador   |

## 🧪 Testes

```bash
npm test            # roda todos os testes uma vez
npm run test:watch  # roda em modo watch (re-executa ao salvar)
```

Cobertura atual: rate limiter, sanitização XSS, formatação BRL/CSV e lógica de recorrência (monthKey, nextOccurrence, daysUntil).

## 🔑 Configurando o login com Google (OAuth)

1. Acesse o [Google Cloud Console](https://console.cloud.google.com) e crie/abra um projeto
2. Vá em **APIs e serviços → Tela de permissão OAuth**:
   - Marque **Externo**, preencha nome do app e e-mail de suporte
   - Em **Publicar app**, confirme a publicação (evita o aviso "app não verificado" para contas próprias)
3. Vá em **APIs e serviços → Credenciais → Criar credenciais → IDs do cliente OAuth**:
   - Tipo: **Aplicativo da Web**
   - **URIs de redirecionamento autorizados** (não é a origem!):
     - `https://localhost:3000/api/auth/callback/google`
     - em produção: `https://SEU-DOMINIO/api/auth/callback/google`
4. Copie o **ID do cliente** e a **Chave secreta do cliente** para o `.env` (`GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`)
5. Reinicie o servidor e o botão "Entrar com Google" aparecerá na tela de login

> O primeiro login do Google cria a conta automaticamente (e-mail já vem verificado pelo Google).

## ✉️ Configurando o envio de e-mails

O app tenta enviar na seguinte ordem: **SMTP (Gmail)** → **Resend** → console (dev).

### Opção 1 — Gmail (SMTP) — grátis e sem domínio

1. Ative a **Verificação em duas etapas** na sua conta Google (https://myaccount.google.com/security)
2. Acesse https://myaccount.google.com/apppasswords e crie uma **Senha de app** (tipo: Correio/Mail)
3. Preencha no `.env`:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="seuemail@gmail.com"
SMTP_PASS="<senha de app de 16 dígitos, sem espaços>"
EMAIL_FROM="Gestor Financeiro <seuemail@gmail.com>"
```

> O Gmail permite enviar para **qualquer** e-mail. Limite de ~500 e-mails/dia — suficiente para códigos de verificação.

### Opção 2 — Resend (requer domínio para enviar a qualquer e-mail)

1. Crie uma conta em [resend.com](https://resend.com)
2. Em **API Keys**, gere uma chave e cole em `RESEND_API_KEY`
3. Em **Domínios**, adicione e verifique um domínio (com o domínio de teste `resend.dev`, o e-mail **só chega para o e-mail da própria conta**)
4. Ajuste `EMAIL_FROM` para o seu domínio verificado

### Sem nenhuma configuração

O código aparece no console do servidor — útil para desenvolvimento.

## ☁️ Deploy (Vercel)

O projeto está pronto para deploy na [Vercel](https://vercel.com):

1. Suba o código para um repositório no GitHub e importe-o na Vercel
2. Use um PostgreSQL na nuvem (ex.: [Neon](https://neon.tech) ou [Supabase](https://supabase.com)) e obtenha a `DATABASE_URL`
3. Configure as variáveis de ambiente na Vercel: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST="true"`, `EMAIL_FROM`, `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` (ou `RESEND_API_KEY`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `SENTRY_DSN` (opcional)
4. Rode as migrações no banco da nuvem:

```bash
npx prisma migrate deploy
```

5. Faça o deploy 🚀

## 🗺️ Próximas ideias

- [ ] Parcelamento de compras
- [ ] Recorrências semanais/quinzenais/anuais
- [ ] Upload de comprovantes
- [ ] Importação de extratos (OFX)

---

<div align="center">

Feito com 💚 para o **Gestor Financeiro** · Next.js · TypeScript · Tailwind · Prisma · PostgreSQL

</div>
