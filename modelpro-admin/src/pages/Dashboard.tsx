import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList,
} from 'recharts'
import {
  Users, UserCheck, UserCircle, ShoppingBag, MessageSquareWarning,
  TrendingUp, CalendarCheck, Crown, AlertTriangle, Star, ArrowRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { statsApi, type AdminStats } from '@/lib/api'
import { StatCardSkeleton } from '@/components/shared/Skeleton'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatPrice, formatDate } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  'Livrée':      '#2D6A4F',
  'En cours':    '#7C3AED',
  'Acceptée':    '#2563EB',
  'En attente':  '#C9762B',
  'En finition': '#D97706',
  'Prête':       '#059669',
  'Annulée':     '#C1121F',
}

const STATUS_LABELS: Record<string, string> = {
  en_attente:  'En attente',
  acceptee:    'Acceptée',
  en_cours:    'En cours',
  en_finition: 'En finition',
  prete:       'Prête',
  livree:      'Livrée',
  annulee:     'Annulée',
}

const TT_STYLE = {
  background: '#fff',
  border: '1px solid #e8d9c8',
  borderRadius: 8,
  boxShadow: '0 4px 16px rgba(139,58,15,0.08)',
  fontSize: 12,
  fontFamily: '"DM Sans", sans-serif',
  color: '#1a1005',
}

// ── Animated number ───────────────────────────────────────────────────────────

function AnimatedNumber({ value, format }: { value: number; format?: (n: number) => string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {format ? format(value) : value.toLocaleString('fr-FR')}
    </motion.span>
  )
}

// ── Chart card wrapper ────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children, delay }: {
  title: string
  subtitle?: string
  children: React.ReactNode
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="bg-surface-card rounded-xl shadow-card p-6"
    >
      <div className="mb-5">
        <h3 className="font-display font-semibold text-ink text-base tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-ink-sub mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['stats'],
    queryFn: () => statsApi.get().then((r) => r.data),
    staleTime: 60_000,
    refetchInterval: 120_000,
  })

  const today = formatDate(new Date().toISOString())

  // Hero metrics — 4 most important KPIs
  const heroMetrics = stats ? [
    {
      label: "Chiffre d'affaires",
      value: stats.chiffreAffairesTotal,
      format: formatPrice,
      sublabel: 'Toutes commandes confondues',
      icon: <TrendingUp size={14} />,
      accent: true,
    },
    {
      label: 'Commandes',
      value: stats.totalCommandes,
      sublabel: 'Total sur la plateforme',
      icon: <ShoppingBag size={14} />,
    },
    {
      label: 'Artisans validés',
      value: stats.totalArtisansActifs,
      sublabel: 'Profils approuvés',
      icon: <UserCheck size={14} />,
    },
    {
      label: 'Utilisateurs',
      value: stats.totalUsers,
      sublabel: `Dont ${stats.totalClients} clients`,
      icon: <Users size={14} />,
    },
  ] : []

  // Secondary compact KPIs
  const secondaryKpis = stats ? [
    { icon: <CalendarCheck size={16} />, label: 'Rendez-vous',       value: stats.totalAppointments,      accent: 'text-brand-500' },
    { icon: <Crown size={16} />,        label: 'Abonnements actifs', value: stats.totalAbonnementsActifs, accent: 'text-warning'   },
    { icon: <UserCircle size={16} />,   label: 'Clients',            value: stats.totalClients,           accent: 'text-brand-400' },
  ] : []

  // Bar chart
  const orderStatusData = stats?.commandesParStatut
    ? stats.commandesParStatut
        .map((s) => ({
          statut: STATUS_LABELS[s.statut] ?? s.statut,
          count:  Number(s.count),
          color:  STATUS_COLORS[STATUS_LABELS[s.statut] ?? s.statut] ?? '#c9762b',
        }))
        .sort((a, b) => b.count - a.count)
    : []

  // Donut chart
  const rolesData = stats
    ? [
        { name: 'Clients',  value: stats.totalClients,          color: '#c9762b' },
        { name: 'Artisans', value: stats.totalArtisansActifs,   color: '#8b3a0f' },
        { name: 'Admin',    value: Math.max(0, stats.totalUsers - stats.totalClients - stats.totalArtisansActifs), color: '#e0843d' },
      ]
    : []

  const totalUsers = rolesData.reduce((s, r) => s + r.value, 0)

  const topMetiers = stats?.statistiquesAvancees?.metiersPlusDemandes ?? []
  const topArtisans = stats?.statistiquesAvancees?.artisansMieuxNotes ?? []
  const hasAlerts = stats && (stats.totalClaims > 0 || stats.commandesEnRetardCount > 0)

  return (
    <div className="min-h-full">
      <PageHeader title="Tableau de bord" subtitle={`Vue d'ensemble — ${today}`} />

      {/* ── Hero strip ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 mb-8 bg-surface-card rounded-2xl shadow-card overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-6 py-5 border-r border-surface-border last:border-r-0 animate-shimmer">
              <div className="h-2.5 w-20 bg-surface-muted rounded mb-4" />
              <div className="h-9 w-28 bg-surface-muted rounded mb-3" />
              <div className="h-2.5 w-32 bg-surface-muted rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-surface-border mb-8 bg-surface-card rounded-2xl shadow-card overflow-hidden">
          {heroMetrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className={`relative px-6 py-5 ${m.accent ? 'bg-brand-50' : ''}`}
            >
              {m.accent && (
                <div className="absolute left-0 top-4 bottom-4 w-[3px] bg-brand-500 rounded-r-full" />
              )}
              <p className="text-[10px] tracking-[0.14em] uppercase font-display font-semibold text-ink-muted mb-3">
                {m.label}
              </p>
              <p className={`font-display font-black leading-none mb-3 ${
                m.accent ? 'text-brand-600 text-[1.9rem]' : 'text-ink text-[2rem]'
              }`}>
                <AnimatedNumber value={m.value} format={m.format} />
              </p>
              <div className="flex items-center gap-1.5">
                <span className={m.accent ? 'text-brand-500' : 'text-ink-muted'}>{m.icon}</span>
                <span className="text-[11px] text-ink-muted font-sans leading-tight">{m.sublabel}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Alert row — conditional ─────────────────────────────────────────── */}
      {!isLoading && hasAlerts && (
        <div className={`grid gap-4 mb-6 ${
          stats!.totalClaims > 0 && stats!.commandesEnRetardCount > 0
            ? 'grid-cols-1 sm:grid-cols-2'
            : 'grid-cols-1 sm:grid-cols-[400px]'
        }`}>
          {stats!.totalClaims > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.32, delay: 0.3 }}
              className="flex items-center gap-4 bg-surface-card rounded-xl p-4 shadow-card border-l-4 border-danger cursor-pointer transition-shadow duration-200 hover:shadow-lifted"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(193,18,31,0.08)' }}>
                <MessageSquareWarning size={18} className="text-danger" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.12em] text-ink-muted font-display font-semibold">
                  Réclamations ouvertes
                </p>
                <p className="font-display font-black text-2xl text-danger leading-none mt-0.5">
                  {stats!.totalClaims}
                </p>
              </div>
              <ArrowRight size={15} className="text-ink-muted shrink-0" />
            </motion.div>
          )}
          {stats!.commandesEnRetardCount > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.32, delay: 0.36 }}
              className="flex items-center gap-4 bg-surface-card rounded-xl p-4 shadow-card border-l-4 border-warning cursor-pointer transition-shadow duration-200 hover:shadow-lifted"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(217,119,6,0.08)' }}>
                <AlertTriangle size={18} className="text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.12em] text-ink-muted font-display font-semibold">
                  Commandes en retard
                </p>
                <p className="font-display font-black text-2xl text-warning leading-none mt-0.5">
                  {stats!.commandesEnRetardCount}
                </p>
              </div>
              <ArrowRight size={15} className="text-ink-muted shrink-0" />
            </motion.div>
          )}
        </div>
      )}

      {/* ── Secondary KPIs ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
          : secondaryKpis.map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.28 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="bg-surface-card rounded-xl px-5 py-4 shadow-card flex items-center gap-3 cursor-default transition-shadow duration-200 hover:shadow-lifted"
              >
                <div className={`w-9 h-9 rounded-lg bg-surface-muted flex items-center justify-center shrink-0 ${kpi.accent}`}>
                  {kpi.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-ink-muted font-display font-semibold truncate">
                    {kpi.label}
                  </p>
                  <p className="font-display font-black text-xl text-ink leading-none mt-0.5">
                    <AnimatedNumber value={kpi.value} />
                  </p>
                </div>
              </motion.div>
            ))}
      </div>

      {/* ── Charts row 1 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 mb-6">

        <ChartCard title="Commandes par statut" subtitle="Distribution des statuts actifs" delay={0.44}>
          {orderStatusData.length === 0 ? (
            <p className="text-sm text-ink-sub text-center py-10">Aucune commande</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={orderStatusData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }} barSize={28}>
                <XAxis
                  dataKey="statut"
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: '#b0a090', fontFamily: '"DM Sans", sans-serif' }}
                />
                <YAxis
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: '#b0a090', fontFamily: '"DM Sans", sans-serif' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={TT_STYLE}
                  cursor={{ fill: 'rgba(201,118,43,0.05)' }}
                  formatter={(v: number) => [v, 'Commandes']}
                />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {orderStatusData.map((entry) => (
                    <Cell key={entry.statut} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{ fontSize: 11, fontFamily: '"DM Sans", sans-serif', fill: '#7a6a58', fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Répartition des rôles" subtitle="Composition de la base" delay={0.5}>
          <div className="flex flex-col items-center gap-5">
            <ResponsiveContainer width={152} height={152}>
              <PieChart>
                <Pie
                  data={rolesData}
                  cx="50%" cy="50%"
                  innerRadius={42} outerRadius={68}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {rolesData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TT_STYLE} formatter={(v: number, n: string) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 w-full">
              {rolesData.map((entry) => {
                const pct = totalUsers > 0 ? Math.round((entry.value / totalUsers) * 100) : 0
                return (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
                    <span className="text-xs text-ink-sub flex-1">{entry.name}</span>
                    <span className="text-xs font-display font-bold text-ink">{entry.value}</span>
                    <span className="text-[10px] text-ink-muted w-7 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ── Charts row 2 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <ChartCard title="Métiers les plus représentés" subtitle="Par nombre d'artisans actifs" delay={0.56}>
          {topMetiers.length === 0 ? (
            <p className="text-sm text-ink-sub text-center py-8">Aucune donnée</p>
          ) : (
            <div className="flex flex-col gap-4">
              {topMetiers.slice(0, 5).map((m, i) => {
                const max = topMetiers[0]?.count ?? 1
                const pct = Math.round((m.count / max) * 100)
                return (
                  <div key={m.metier}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-display font-semibold text-ink">{m.metier}</span>
                      <span className="text-ink-muted">{m.count} artisan{m.count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'linear-gradient(90deg, #8b3a0f, #e0843d)' }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.65, delay: 0.56 + i * 0.08, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Artisans les mieux notés" subtitle="Top 5 par note moyenne" delay={0.62}>
          {topArtisans.length === 0 ? (
            <p className="text-sm text-ink-sub text-center py-8">Aucune donnée</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topArtisans.slice(0, 5).map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.28, delay: 0.62 + i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-display font-black shrink-0 ${
                    i === 0 ? 'bg-brand-100 text-brand-700'  :
                    i === 1 ? 'bg-surface-muted text-ink-sub' :
                    i === 2 ? 'bg-amber-50 text-amber-700'   :
                    'bg-surface-muted text-ink-muted'
                  }`}>
                    {i + 1}
                  </div>
                  <span className="text-sm text-ink font-display font-medium flex-1 truncate min-w-0">
                    {a.métier}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star size={12} className="text-warning fill-warning" />
                    <span className="text-sm font-display font-bold text-ink">{a.noteMoyenne?.toFixed(1)}</span>
                    <span className="text-[10px] text-ink-muted">({a.nombreAvis})</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
