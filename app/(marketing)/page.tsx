import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Calculator,
  Check,
  ChevronRight,
  DollarSign,
  FolderOpen,
  Repeat,
  Shield,
  Target,
  Wallet,
} from '@/components/icons'

const features = [
  {
    icon: Wallet,
    title: 'Múltiplas contas',
    description: 'Carteira, poupança, conta corrente, investimento, gerencie todas em um só lugar.',
    color: 'bg-brand-500',
  },
  {
    icon: ArrowLeftRight,
    title: 'Transferências',
    description: 'Transfira valores entre contas com registro automático de entrada e saída.',
    color: 'bg-sky-500',
  },
  {
    icon: Repeat,
    title: 'Recorrências',
    description: 'Cadastre receitas e despesas recorrentes. O sistema gera automaticamente todo mês.',
    color: 'bg-violet-500',
  },
  {
    icon: Calculator,
    title: 'Orçamentos',
    description: 'Defina limites por categoria e acompanhe quanto já gastou do previsto.',
    color: 'bg-amber-500',
  },
  {
    icon: Target,
    title: 'Metas de savings',
    description: 'Defina objetivos financeiros e faça aportes periódicos para alcançá-los.',
    color: 'bg-rose-500',
  },
  {
    icon: BarChart3,
    title: 'Estatísticas',
    description: 'Gráficos de entradas vs saídas, top categorias e evolução mensal.',
    color: 'bg-indigo-500',
  },
  {
    icon: FolderOpen,
    title: 'Categorias',
    description: 'Organize transações com categorias personalizadas com ícones e cores.',
    color: 'bg-teal-500',
  },
  {
    icon: Bell,
    title: 'Alertas de vencimento',
    description: 'Receba notificações quando faltam poucos dias para o vencimento de contas recorrentes.',
    color: 'bg-orange-500',
  },
]

const steps = [
  {
    number: '1',
    title: 'Crie sua conta',
    description: 'Cadastre-se gratuitamente com e-mail e senha. Verificação por e-mail incluída.',
  },
  {
    number: '2',
    title: 'Adicione suas contas',
    description: 'Crie carteiras, contas bancárias e investimentos com saldos iniciais.',
  },
  {
    number: '3',
    title: 'Registre transações',
    description: 'Adicione entradas, saídas e transferências. Configure recorrências para não esquecer.',
  },
  {
    number: '4',
    title: 'Acompanhe tudo',
    description: 'Veja o dashboard, gráficos e estatísticas para tomar decisões financeiras melhores.',
  },
]

const techStack = [
  'Next.js 16',
  'React 19',
  'Tailwind CSS',
  'Prisma',
  'PostgreSQL',
  'NextAuth',
  'Vercel',
]

export default async function LandingPage() {
  const session = await auth()
  if (session?.user?.id) redirect('/dashboard')
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 app-backdrop-gradient" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-32 lg:py-40">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl lg:text-6xl">
            Controle financeiro{' '}
            <span className="text-brand-600 dark:text-brand-400">simples</span> e{' '}
            <span className="text-brand-600 dark:text-brand-400">poderoso</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600 dark:text-slate-400">
            Gerencie entradas, saídas, contas, orçamentos, metas e recorrências em um só lugar.
            Dashboards, gráficos e alertas para você nunca mais perder o controle do seu dinheiro.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login?mode=register"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600"
            >
              Começar agora
              <ChevronRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/viniscastro/gestor-financeiro"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Ver no GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Dashboard preview placeholder */}
      <section className="border-y border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
              <span className="h-3 w-3 rounded-full bg-rose-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-4 text-xs text-slate-500 dark:text-slate-400">
                gestor-financeiro-kappa-five.vercel.app/dashboard
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
              <div className="rounded-xl bg-brand-500 p-4 text-white">
                <p className="text-xs font-medium opacity-80">Saldo total</p>
                <p className="mt-1 text-xl font-bold">R$ 12.450,00</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-xs font-medium text-emerald-700">Entradas</p>
                <p className="mt-1 text-xl font-bold text-emerald-600">R$ 8.200,00</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-4">
                <p className="text-xs font-medium text-rose-700">Saídas</p>
                <p className="mt-1 text-xl font-bold text-rose-600">R$ 3.750,00</p>
              </div>
              <div className="rounded-xl bg-sky-50 p-4">
                <p className="text-xs font-medium text-sky-700">Guardado</p>
                <p className="mt-1 text-xl font-bold text-sky-600">R$ 2.100,00</p>
              </div>
            </div>
            <div className="border-t border-slate-200 p-4 dark:border-slate-700">
              <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Transações recentes
              </p>
              <div className="space-y-2">
                {[
                  { desc: 'Salário', type: 'INCOME', value: '+R$ 5.500,00', color: 'bg-emerald-500' },
                  { desc: 'Aluguel', type: 'EXPENSE', value: '-R$ 1.800,00', color: 'bg-rose-500' },
                  { desc: 'Mercado', type: 'EXPENSE', value: '-R$ 634,50', color: 'bg-rose-500' },
                ].map((t) => (
                  <div key={t.desc} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white ${t.color}`}>
                        {t.type === 'INCOME' ? '+' : '–'}
                      </span>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{t.desc}</span>
                    </div>
                    <span className={`text-sm font-semibold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
              Tudo que você precisa
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-slate-600 dark:text-slate-400">
              Ferramentas completas para organizar suas finanças pessoais sem complicação.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.color}`}>
                  <f.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-50">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-background">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
              Como funciona
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-slate-600 dark:text-slate-400">
              Comece a controlar suas finanças em 4 passos simples.
            </p>
          </div>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.number} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white">
                  {s.number}
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900 dark:text-slate-50">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                Seus dados,{' '}
                <span className="text-brand-600 dark:text-brand-400">seu controle</span>
              </h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                Tema claro e escuro, drag-and-drop para reordenar, exportação CSV,
                e um sistema completo de autenticação com verificação por e-mail.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'PWA — instale no celular como app',
                  'Exportação de transações em CSV',
                  'Ícones Lucide personalizáveis',
                  'Seleção de cores com palette + custom',
                  'Arrastar e soltar para reordenar',
                  'Backup dos seus dados',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Dashboard personalizável</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Escolha quais cards aparecem</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500">
                    <Repeat className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Gerenciamento recorrente</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Crie regras que se repetem todo mês</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Metas de savings</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Acompanhe seu progresso com ícones</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Segurança</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Autenticação por código + sessão segura</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="border-t border-slate-200 bg-slate-50 py-16 dark:border-slate-800 dark:bg-background">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Tecnologias utilizadas</h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {techStack.map((t) => (
              <span
                key={t}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
            Comece a controlar seu dinheiro hoje
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-slate-600 dark:text-slate-400">
            É rápido, gratuito e você nunca mais vai se perguntar onde seu dinheiro foi parar.
          </p>
          <Link
            href="/login?mode=register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600"
          >
            Criar minha conta grátis
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </>
  )
}
