<div align="center">

# 🐷 Gestor Financeiro

### Controle suas finanças pessoais de forma simples e elegante.

Uma aplicação web completa para gerenciar **entradas e saídas** de dinheiro, com **múltiplas contas e transferências**, **cartões de crédito com faturas e importação CSV/OFX**, orçamentos por categoria, lançamentos recorrentes, **metas de economia** e gráficos estatísticos — tudo em **tempo real**, construída com Next.js e PostgreSQL.

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
- 🏷️ **Categorias gerenciáveis** — categorias padrão (receitas e despesas) com cores e ícones; crie **subcategorias**, edite, reordene e exclua as que não usa pela tela de Categorias
- 🎯 **Orçamentos mensais por categoria** — defina um limite por categoria e acompanhe o gasto do mês com barra de progresso e alerta visual ao se aproximar/estourar
- 📆 **Lançamentos recorrentes** — transações automáticas mensais (dia do mês), com ativação/desativação, **marcar como paga**, lembrete por e-mail com dias de antecedência, **arrastar para reordenar** e **desfazer exclusão**
- 🏦 **Metas de economia** — defina objetivos (viagem, reserva...) com valor alvo e data; acompanhe o progresso pelo valor guardado
- 🏷️ **Gerenciamento de categorias** — crie, **edite** e exclua categorias de entrada e saída, com cores e ícones customizáveis e organização em **subcategorias**
- 📤 **Importação de transações (CSV/OFX)** — importe extrato bancário genérico no menu Transações, com reconhecimento automático de colunas (data/descrição/valor) e de débito/crédito
- 📤 **Exportar CSV** — exporte as transações (respeitando os filtros ativos) e um relatório de estatísticas (mensal + por categoria) em CSV pronto para Excel
- 📊 **Dashboard resumido** — saldo total, entradas/saídas do mês, guardado em metas, total de recorrentes, top categorias com barra de progresso, status dos orçamentos e transações mais recentes; **cards personalizáveis** (escolha quais módulos aparecem)
- 🏠 **Metas com aportes automáticos** — além do aporte manual, configure um valor fixo mensal descontado de uma conta automaticamente; metas também têm **ícone** próprio
- 🔍 **Filtros avançados** — busque por texto, filtre por tipo, conta, categoria, mês ou **período personalizado** (data início/fim) nas transações
- 📈 **Estatísticas com gráficos** — evolução mensal dos últimos 6 meses (barras) e despesas por categoria (pizza), com **Recharts**
- 🎨 **Interface moderna** — temas **claro e escuro** com alternância, responsiva (menu lateral que vira gaveta no mobile) e ícones **Phosphor**
- 🖼️ **Foto de perfil** — envie uma imagem (redimensionada no cliente) ou remova, exibida na sidebar e na página de conta
- 📧 **Relatório mensal por e-mail** — no menu Conta, ative o envio automático no dia 1 de cada mês (com botão "Enviar agora") com um **PDF no mesmo layout do menu de cartões**
- 🗑️ **Exclusão com desfazer** — ao excluir qualquer item (transação, conta, categoria, meta, orçamento, recorrência), um toast aparece com botão "Desfazer" para recriar o item
- 📱 **PWA instalável** — manifest, ícones 192/512/maskable, theme-color dinâmico (claro/escuro) e suporte a iOS (apple-touch-icon); instale o app no celular/desktop como atalho de tela cheia
- 🛡️ **Proteção de rotas** — áreas privadas redirecionam para o login; APIs exigem sessão válida (401 sem cookie)
- 💱 **Valores em centavos** — o dinheiro é armazenado como inteiro (cents), sem problemas de ponto flutuante
- 💳 **Cartões de crédito** — cadastre cartões (nome, últimos 4 dígitos, **limite obrigatório**, cor, dia de fechamento e vencimento) e **reordene arrastando**; acompanhe o **limite usado** com barra de progresso na cor do cartão e navegue pelos **meses das faturas**
- 🧾 **Compras e faturas** — adicione compras manualmente por mês, com **parcelamento** (1 a 48x, cada parcela cai na fatura de um mês), veja o **vencimento em dd/mm/aaaa**, selo de fatura **paga** e botão **"Marcar como paga"** que lança a despesa na conta bancária escolhida (ex.: "Pagamento fatura 15/09"); **exporte a fatura em PDF** no mesmo layout da tela
- 📥 **Importar CSV/OFX de cartão** — importe o extrato da fatura com **pop-up de revisão**: uma caixa de seleção por lançamento para definir **o que é abatido da fatura** (saídas somam, entradas subtraem — ex.: saiu R$18, entrou R$10 → fatura de R$8) ou o que fica como entrada sem vínculo com a fatura; botões "Marcar/Desmarcar todas"
- ☑️ **Exclusão em massa** — no menu Transações, selecione várias transações por vez (com "Selecionar todas") e exclua com **botão de confirmação**
- 🔔 **Notificações** — central de notificações (sino) **no app + push notification**, avisos de **fatura a vencer**, e painel de **Admin** para notificar todos os usuários (novidade/bug/sistema)

## 🛡️ Segurança & Operação

- ⏱️ **Rate limiting** — limite por IP nas API routes (auth: 10/15min, API: 120/min); login e códigos de verificação usam contador no banco, compartilhado entre instâncias
- 🧹 **Sanitização de inputs** — proteção contra XSS via DOMPurify em todos os campos de texto
- 🐛 **Monitoramento de erros** — Sentry captura erros em produção com stack trace e contexto (configuração via `SENTRY_DSN`)
- 🧪 **Testes automatizados** — 24 testes com Vitest cobrindo rate limiter, sanitização, formatação e lógica de recorrência
- 💾 **Backup** — exportação de todos os dados em JSON, para download no painel **Admin** (via API)

## 🚀 Stack

| Camada          | Tecnologia                                             |
| --------------- | ------------------------------------------------------ |
| Framework       | [Next.js](https://nextjs.org) 16.3.0 (App Router + Turbopack) |
| Linguagem       | [TypeScript](https://www.typescriptlang.org) 5         |
| UI              | [Tailwind CSS](https://tailwindcss.com) 4 · [Phosphor Icons](https://phosphoricons.com) |
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
│   │   ├── dashboard/          #   Resumo financeiro (faturas a vencer)
│   │   ├── transactions/       #   Entradas/saídas (busca + filtros + exclusão em massa)
│   │   ├── accounts/           #   Multi-contas e transferências
│   │   ├── budgets/            #   Orçamentos mensais por categoria
│   │   ├── categories/         #   Gerenciar categorias (criar/excluir)
│   │   ├── recurring/          #   Lançamentos recorrentes (arrastar p/ reordenar)
│   │   ├── cards/              #   Cartões de crédito, faturas e import CSV/OFX
│   │   ├── goals/              #   Metas de economia
│   │   ├── stats/              #   Gráficos e estatísticas (exportar Excel)
│   │   ├── account/            #   Conta (foto, tema, relatório email, excluir)
│   │   ├── admin/              #   Painel admin (usuários, notificar, relatórios)
│   │   └── layout.tsx          #   Layout com sidebar
│   ├── (auth)/login/           # Tela única de login + cadastro
│   ├── (marketing)/            # Landing page (para visitantes)
│   ├── verify-email/page.tsx   # Confirmação de e-mail com código
│   ├── forgot-password/        # Redefinição de senha (3 telas):
│   │   ├── page.tsx            #   Tela 1 — informar e-mail
│   │   ├── verify/page.tsx     #   Tela 2 — digitar código de verificação
│   │   └── reset/page.tsx      #   Tela 3 — definir nova senha
│   ├── api/                    # Rotas: auth, register, verify-email, resend-verification,
│   │                           # forgot-password, verify-reset-code, reset-password,
│   │                           # transactions (import), transfers, accounts, categories,
│   │                           # budgets, recurring (pay), goals (topup), cards,
│   │                           # cards/[id] (import/transactions), cards/statements,
│   │                           # bills (statement-paid/mark-paid), notifications,
│   │                           # push/subscribe, admin (users/notify), stats/category-comparison,
│   │                           # reports/monthly, backups, account (avatar/request-delete-code),
│   │                           # user/preferences
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
  password             String         // hash bcrypt
  role                 String         @default("USER")  // USER | ADMIN
  image                String?
  theme                String         @default("light") // light | dark
  dashboardCards       String?        // cards visíveis no dashboard (JSON)
  monthlyReport        Boolean        @default(false)
  emailVerified        DateTime?
  verificationCode     String?        // hash bcrypt do código de confirmação
  verificationExpires  DateTime?
  verificationSentAt   DateTime?
  resetCode            String?        // hash bcrypt do código de redefinição
  resetExpires         DateTime?
  resetSentAt          DateTime?
  deleteCode           String?        // hash bcrypt do código de exclusão de conta
  deleteCodeExpires    DateTime?
  deleteCodeSentAt     DateTime?
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt
  accounts             Account[]
  categories           Category[]
  budgets              Budget[]
  recurringRules       RecurringRule[]
  goals                SavingsGoal[]
  transactions         Transaction[]
  notifications        Notification[]
  pushSubscriptions    PushSubscription[]
  creditCards          CreditCard[]
  creditCardStatements CreditCardStatement[]
}

model Account {
  id             String         @id @default(cuid())
  userId         String
  name           String
  type           String         @default("CARTEIRA")  // CARTEIRA | INVESTIMENTO | ...
  color          String         @default("#10b981")
  initialBalance Int            @default(0)           // centavos
  position       Int            @default(0)
  transactions   Transaction[]
  recurringRules RecurringRule[] @relation("RecurringFromAccount")
  recurringIncoming RecurringRule[] @relation("RecurringToAccount")
  goals          SavingsGoal[]
  goalsAutoContribute SavingsGoal[] @relation("GoalAutoContribute")
}

model Category {
  id       String   @id @default(cuid())
  userId   String
  name     String
  type     String   // INCOME | EXPENSE
  color    String   @default("#78716c")
  icon     String   @default("tag")
  position Int      @default(0)
  parentId String?  // subcategoria (categoria "pai")
  parent   Category? @relation("CategoryTree")
  children Category[] @relation("CategoryTree")
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
  accountId             String?   // conta de origem (cartão = null)
  toAccountId           String?   // conta de destino (kind = TRANSFER)
  creditCardId          String?   // cartão de crédito (despesa em cartão)
  dayOfMonth            Int
  active                Boolean   @default(true)
  notifyDaysBefore      Int       @default(3)
  lastNotifiedAt        DateTime?
  lastMaterializedMonth String?   // controla materialização (anti-duplicação)
  lastPaidMonth         String?   // mês da última marcação como paga
  position              Int       @default(0) // ordem de exibição (drag-and-drop)
}

model Transaction {
  id                 String         @id @default(cuid())
  transactionType    String         // INCOME | EXPENSE
  description        String
  amount             Int            // centavos
  date               DateTime
  accountId          String?
  categoryId         String?
  transferGroupId    String?        // vincula as duas pernas de uma transferência
  recurringId        String?
  occurrenceMonth    String?        // "YYYY-MM" (materialização de recorrente)
  creditCardId       String?        // se a transação pertence a um cartão de crédito
  installmentGroupId String?        // agrupa parcelas de uma compra
  installmentCurrent Int?
  installmentTotal   Int?
}

model SavingsGoal {
  id            String     @id @default(cuid())
  userId        String
  name          String
  icon          String?
  targetAmount  Int        // centavos
  currentAmount Int        @default(0)   // usado quando não há conta vinculada
  accountId     String?                 // se vinculada, progresso = saldo da conta
  targetDate    DateTime?
  autoContributeAmount     Int?         // valor fixo mensal automático
  autoContributeDayOfMonth Int?
  autoContributeAccountId  String?      // conta de origem do aporte automático
  autoLastMaterializedMonth String?     // anti-duplicação do aporte automático
}

model CreditCard {
  id          String    @id @default(cuid())
  userId      String
  name        String
  last4       String?
  creditLimit Int       @default(0)   // centavos (campo obrigatório no cadastro)
  closingDay  Int       @default(1)
  dueDay      Int       @default(10)
  color       String    @default("#10b981")
  position    Int       @default(0)   // ordem de exibição (drag-and-drop)
  transactions Transaction[]
  statements  CreditCardStatement[]
  recurringRules RecurringRule[]     // despesas recorrentes em cartão
  @@index([userId])
}

model CreditCardStatement {
  id       String     @id @default(cuid())
  userId   String
  cardId   String
  monthKey String     // "YYYY-MM"
  dueDate  DateTime
  status   String     @default("OPEN") // OPEN | PAID
  paidAt   DateTime?
  @@unique([cardId, monthKey])
  @@index([userId, monthKey])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // FATURA_DUE, CARD_DISCOUNT, ADMIN_NOTIFY, ...
  title     String
  message   String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
  @@index([userId, read])
  @@index([userId, createdAt])
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String
  p256dh    String
  auth      String
  userAgent String?
  createdAt DateTime @default(now())
  @@unique([userId, endpoint])
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
| DELETE | `/api/account`                   | Exclui a conta do usuário (verificado por código enviado por e-mail) | 🔒 Auth |
| GET    | `/api/cards`                     | Lista cartões (ordenados por posição)               | 🔒 Auth |
| POST   | `/api/cards`                     | Cria um cartão de crédito (limite obrigatório)      | 🔒 Auth |
| PATCH  | `/api/cards`                     | Reordena cartões (envia `ids[]` na ordem desejada)  | 🔒 Auth |
| PATCH  | `/api/cards/[id]`                | Edita um cartão                                     | 🔒 Auth |
| DELETE | `/api/cards/[id]`                | Exclui um cartão                                    | 🔒 Auth |
| GET    | `/api/cards/[id]/transactions`   | Lista transações de um cartão (por mês da fatura)   | 🔒 Auth |
| POST   | `/api/cards/[id]/transactions`   | Adiciona compra a um cartão (aceita `installments` para parcelar) | 🔒 Auth |
| POST   | `/api/cards/[id]/import`         | Importa CSV/OFX (com flag `abate` para a fatura)    | 🔒 Auth |
| GET    | `/api/cards/statements`          | Lista faturas dos cartões                           | 🔒 Auth |
| POST   | `/api/bills/statement-paid`      | Marca fatura paga + debita a conta escolhida        | 🔒 Auth |
| POST   | `/api/bills/mark-paid`           | Marca fatura recorrente como paga (sem debitar)     | 🔒 Auth |
| GET    | `/api/notifications`             | Lista notificações do usuário                       | 🔒 Auth |
| POST   | `/api/push/subscribe`            | Registra assinatura de push notification            | 🔒 Auth |
| POST   | `/api/admin/notify`              | Envia notificação a todos os usuários (admin)       | 🔒 Admin |
| GET    | `/api/admin/users`               | Lista usuários (admin)                              | 🔒 Admin |
| GET    | `/api/stats/category-comparison` | Compara gastos por categoria entre datas (admin)    | 🔒 Auth |
| GET    | `/api/reports/monthly`           | Relatório mensal em PDF (email automático e "Enviar agora") | 🔒 Auth |
| GET    | `/api/backup`                    | Baixa uma exportação JSON do banco (admin)          | 🔒 Admin |
| POST   | `/api/goals/[id]/topup`          | Faz um aporte manual a uma meta                     | 🔒 Auth |
| POST   | `/api/recurring/[id]/pay`        | Marca uma recorrência como paga                     | 🔒 Auth |
| POST   | `/api/transactions/import`       | Importa transações genéricas (CSV/OFX)              | 🔒 Auth |
| POST   | `/api/account/request-delete-code` | Envia código para confirmar a exclusão da conta   | 🔒 Auth |
| PATCH  | `/api/user/preferences`          | Atualiza preferências (tema, dashboard cards, relatório mensal) | 🔒 Auth |

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
SENTRY_DSN="<seu dsn do sentry (opcional)>"
```

Para gerar um `AUTH_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

> ⚠️ Se a senha do banco contiver caracteres especiais (`#`, `$`, `@`...), ela deve ser **codificada na URL** (ex.: `#` → `%23`, `$` → `%24`).

> 💡 Sem SMTP/Resend configurados, o código de confirmação é exibido no **console do servidor** (útil em desenvolvimento). Sem `SENTRY_DSN`, o Sentry fica desligado.

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
| `npx prisma studio`| Visualizar/editar dados no navegador   |

## 🧪 Testes

```bash
npm test            # roda todos os testes uma vez
npm run test:watch  # roda em modo watch (re-executa ao salvar)
```

Cobertura atual: rate limiter, sanitização XSS, formatação BRL/CSV e lógica de recorrência (monthKey, nextOccurrence, daysUntil).

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
3. Configure as variáveis de ambiente na Vercel: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST="true"`, `EMAIL_FROM`, `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` (ou `RESEND_API_KEY`), `CRON_SECRET` e `SENTRY_DSN` (opcional)
4. Prepare o banco da nuvem:

```bash
# Banco novo e vazio
npx prisma db push

# Banco já existente, com o histórico de migrações aplicado
npx prisma migrate deploy
```

   Em banco vazio use `db push`: a migração `20250819_add_delete_code_fields` tem data anterior à `init` e faz o `migrate deploy` falhar.

5. Faça o deploy 🚀

## 🗺️ Próximas ideias

- [ ] Recorrências semanais/quinzenais/anuais
- [ ] Upload de comprovantes (jpeg/png/pdf)
- [ ] Dashboards/relatórios personalizados por período
- [ ] Suporte a mais bancos no importador de extrato

---

<div align="center">

Feito com 💚 para o **Gestor Financeiro** · Next.js · TypeScript · Tailwind · Prisma · PostgreSQL

</div>
