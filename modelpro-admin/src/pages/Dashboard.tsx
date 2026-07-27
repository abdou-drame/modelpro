import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  Users, UserCheck, UserCircle, ShoppingBag, MessageSquareWarning, TrendingUp,
  CalendarCheck, Crown, AlertTriangle, Star,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { statsApi, type AdminStats } from '@/lib/api'
import { StatCardSkeleton } from '@/components/shared/Skeleton'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatPrice, formatDate } from '@/lib/utils'

// ── Colors ────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  'Livrée':      '#2D6A4F',
  'En cours':    '#7C3AED',
  'Acceptée':    '#2563EB',
  'En attente':  '#C9762B',
  'En finition': '#D97706',
  'Prête':       '#059669',
  'Annulée':     '#C1121F',
}

const ROLE_COLORS = ['#c9762b', '#8b3a0f', '#e0843d']

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#fff',
    border: '1px solid #e8d9c8',
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(139,58,15,0.08)',
    fontSize: 12,
    fontFamily: 'Inter, sans-serif',
    color: '#1a1005',
  },
  cursor: { fill: 'rgba(201,118,43,0.06)' },
}

// ── Animated counter ──────────────────────────────────────────────────────────

function AnimatedNumber({ value, format }: { value: number; format?: (n: number) => string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {format ? format(value) : value.toLocaleString('fr-FR')}
    </motion.span>
  )
}

// ── KPI stat card ─────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number
  format?: (n: number) => string
  accent?: string
  delay: number
  badge?: { label: string; color: string }
}

function StatCard({ icon, label, value, format, accent = 'text-brand-600', delay, badge }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, boxShadow: '0 8px 32px 0 rgba(139,58,15,0.12)' }}
      className="bg-surface-card rounded-xl p-5 shadow-card cursor-default"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-display font-semibold tracking-widest uppercase text-ink-sub">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: badge.color + '18', color: badge.color }}>
              {badge.label}
            </span>
          )}
          <div className={`${accent} opacity-70`}>{icon}</div>
        </div>
      </div>
      <div className="font-display font-black text-3xl tracking-tight text-ink leading-none mb-1">
        <AnimatedNumber value={value} format={format} />
      </div>
      <div className="mt-4 h-[3px] rounded-full bg-surface-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-brand-500"
          initial={{ width: '0%' }}
          animate={{ width: `${Math.min(100, 20 + (value % 80))}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="bg-surface-card rounded-xl shadow-card p-6"
    >
      <div className="mb-6">
        <h3 className="font-display font-semibold text-ink text-base tracking-tight">
          {title}
        </h3>
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

  // KPI cards
  const kpiCards = stats ? [
    { icon: <Users size={18} />,              label: 'Utilisateurs',        value: stats.totalUsers,             accent: 'text-brand-600' },
    { icon: <UserCheck size={18} />,          label: 'Artisans validés',     value: stats.totalArtisansActifs,    accent: 'text-success' },
    { icon: <UserCircle size={18} />,         label: 'Clients',              value: stats.totalClients,           accent: 'text-brand-500' },
    { icon: <ShoppingBag size={18} />,        label: 'Commandes',            value: stats.totalCommandes,         accent: 'text-brand-700' },
    { icon: <CalendarCheck size={18} />,      label: 'Rendez-vous',          value: stats.totalAppointments,      accent: 'text-brand-500' },
    { icon: <Crown size={18} />,              label: 'Abonnements actifs',   value: stats.totalAbonnementsActifs, accent: 'text-warning' },
    { icon: <MessageSquareWarning size={18} />, label: 'Réclamations',       value: stats.totalClaims,            accent: 'text-danger',
      badge: stats.totalClaims > 0 ? { label: 'À traiter', color: '#C1121F' } : undefined },
    { icon: <AlertTriangle size={18} />,      label: 'Commandes en retard',  value: stats.commandesEnRetardCount, accent: 'text-warning',
      badge: stats.commandesEnRetardCount > 0 ? { label: 'Retard', color: '#D97706' } : undefined },
    { icon: <TrendingUp size={18} />,         label: "Chiffre d'affaires",   value: stats.chiffreAffairesTotal,   format: formatPrice, accent: 'text-success' },
  ] : []

  // Bar chart — commandes par statut (données réelles)
  const STATUS_LABELS: Record<string, string> = {
    en_attente:  'En attente',
    acceptee:    'Acceptée',
    en_cours:    'En cours',
    en_finition: 'En finition',
    prete:       'Prête',
    livree:      'Livrée',
    annulee:     'Annulée',
  }
  const orderStatusData = stats?.commandesParStatut
    ? stats.commandesParStatut.map((s) => ({
        statut: STATUS_LABELS[s.statut] ?? s.statut,
        count:  Number(s.count),
        color:  STATUS_COLORS[STATUS_LABELS[s.statut] ?? s.statut] ?? '#c9762b',
      })).sort((a, b) => b.count - a.count)
    : []

  // Pie chart — répartition rôles
  const rolesData = stats ? [
    { name: 'Clients',  value: stats.totalClients,          color: ROLE_COLORS[0] },
    { name: 'Artisans', value: stats.totalArtisansActifs,   color: ROLE_COLORS[1] },
    { name: 'Admin',    value: stats.totalUsers - stats.totalClients - stats.totalArtisansActifs, color: ROLE_COLORS[2] },
  ] : []

  // Top métiers
  const topMetiers = stats?.statistiquesAvancees?.metiersPlusDemandes ?? []

  // Top artisans
  const topArtisans = stats?.statistiquesAvancees?.artisansMieuxNotes ?? []

  return (
    <div className="min-h-full">
      <PageHeader
        title="Tableau de bord"
        subtitle={`Vue d'ensemble — ${today}`}
      />

      {/* KPI grid — 3 colonnes */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {isLoading
          ? Array.from({ length: 9 }).map((_, i) => <StatCardSkeleton key={i} />)
          : kpiCards.map((card, i) => (
              <StatCard
                key={card.label}
                icon={card.icon}
                label={card.label}
                value={card.value}
                format={card.format}
                accent={card.accent}
                badge={card.badge}
                delay={i * 0.05}
              />
            ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mb-6">

        {/* Répartition des rôles */}
        <ChartCard title="Répartition des utilisateurs" subtitle="Clients, artisans et administrateurs" delay={0.36}>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={rolesData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {rolesData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE.contentStyle} formatter={(v: number, n: string) => [v, n]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-3 flex-1">
              {rolesData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                    <span className="text-sm text-ink-sub font-sans">{entry.name}</span>
                  </div>
                  <span className="text-sm font-bold text-ink">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        {/* Top métiers */}
        <ChartCard title="Métiers les plus représentés" subtitle="Par nombre d'artisans" delay={0.42}>
          {topMetiers.length === 0 ? (
            <p className="text-sm text-ink-sub text-center py-8">Aucune donnée</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topMetiers.slice(0, 5).map((m, i) => {
                const max = topMetiers[0]?.count ?? 1
                const pct = Math.round((m.count / max) * 100)
                return (
                  <div key={m.metier}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink font-medium">{m.metier}</span>
                      <span className="text-ink-sub">{m.count} artisan{m.count > 1 ? 's' : ''}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-brand-500"
                        initial={{ width: '0%' }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, delay: 0.42 + i * 0.07, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">

        {/* Commandes par statut */}
        <ChartCard title="Commandes par statut" subtitle="Distribution des statuts actifs" delay={0.48}>
          {orderStatusData.length === 0 ? (
            <p className="text-sm text-ink-sub text-center py-8">Aucune commande</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={orderStatusData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ebe3" />
                <XAxis
                  dataKey="statut"
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 10, fill: '#7a6a58', fontFamily: 'Inter, sans-serif' }}
                />
                <YAxis
                  axisLine={false} tickLine={false}
                  tick={{ fontSize: 11, fill: '#7a6a58', fontFamily: 'Inter, sans-serif' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE.contentStyle}
                  cursor={TOOLTIP_STYLE.cursor}
                  formatter={(value: number) => [value, 'Commandes']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {orderStatusData.map((entry) => (
                    <Cell key={entry.statut} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top artisans mieux notés */}
        <ChartCard title="Artisans les mieux notés" subtitle="Top 5 par note moyenne" delay={0.54}>
          {topArtisans.length === 0 ? (
            <p className="text-sm text-ink-sub text-center py-8">Aucune donnée</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topArtisans.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-ink-sub w-4 shrink-0">{i + 1}</span>
                    <span className="text-sm text-ink font-medium truncate">{a.métier}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Star size={13} className="text-warning fill-warning" />
                    <span className="text-sm font-bold text-ink">{a.noteMoyenne?.toFixed(1)}</span>
                    <span className="text-xs text-ink-sub">({a.nombreAvis} avis)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
