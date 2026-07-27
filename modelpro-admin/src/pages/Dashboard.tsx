import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'
import {
  Users, UserCheck, UserCircle, ShoppingBag, MessageSquareWarning, TrendingUp,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { statsApi, type AdminStats } from '@/lib/api'
import { StatCardSkeleton } from '@/components/shared/Skeleton'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatPrice, formatDate } from '@/lib/utils'

// ── Mock chart data ────────────────────────────────────────────────────────────

const ORDERS_BY_STATUS = [
  { statut: 'Livrée',      count: 38 },
  { statut: 'En cours',    count: 27 },
  { statut: 'Acceptée',    count: 19 },
  { statut: 'En attente',  count: 14 },
  { statut: 'En finition', count: 10 },
  { statut: 'Prête',       count:  7 },
  { statut: 'Annulée',     count:  5 },
]

const ROLES_DATA = [
  { name: 'Clients',   value: 10, color: '#c9762b' },
  { name: 'Artisans',  value:  8, color: '#8b3a0f' },
  { name: 'Admin',     value:  1, color: '#e0843d' },
]

// ── Tooltip styles ─────────────────────────────────────────────────────────────

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
}

function StatCard({ icon, label, value, format, accent = 'text-brand-600', delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, boxShadow: '0 8px 32px 0 rgba(139,58,15,0.12), 0 2px 8px 0 rgba(139,58,15,0.07)' }}
      className="bg-surface-card rounded-xl p-5 shadow-card cursor-default"
    >
      {/* Icon + label */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-display font-semibold tracking-widest uppercase text-ink-sub">
          {label}
        </span>
        <div className={`${accent} opacity-70`}>{icon}</div>
      </div>

      {/* Value */}
      <div className={`font-display font-black text-3xl tracking-tight text-ink leading-none mb-1`}>
        <AnimatedNumber value={value} format={format} />
      </div>

      {/* Subtle trend line (decorative) */}
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

function ChartCard({
  title, children, delay,
}: {
  title: string
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
      <h3 className="font-display font-semibold text-ink text-base tracking-tight mb-6">
        {title}
      </h3>
      {children}
    </motion.div>
  )
}

// ── Custom legend for pie chart ────────────────────────────────────────────────

function CustomLegend() {
  return (
    <div className="flex justify-center gap-5 mt-4">
      {ROLES_DATA.map((entry) => (
        <div key={entry.name} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-ink-sub font-sans">
            {entry.name} <span className="text-ink font-semibold">{entry.value}</span>
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Dashboard page ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['stats'],
    queryFn: () => statsApi.get().then((r) => r.data),
    staleTime: 60_000,
  })

  const today = formatDate(new Date().toISOString())

  const kpiCards = stats
    ? [
        {
          icon: <Users size={18} />,
          label: 'Utilisateurs',
          value: stats.totalUsers,
          accent: 'text-brand-600',
        },
        {
          icon: <UserCheck size={18} />,
          label: 'Artisans actifs',
          value: stats.totalArtisansActifs,
          accent: 'text-success',
        },
        {
          icon: <UserCircle size={18} />,
          label: 'Clients',
          value: stats.totalClients,
          accent: 'text-brand-500',
        },
        {
          icon: <ShoppingBag size={18} />,
          label: 'Commandes',
          value: stats.totalCommandes,
          accent: 'text-brand-700',
        },
        {
          icon: <MessageSquareWarning size={18} />,
          label: 'Réclamations',
          value: stats.totalClaims,
          accent: 'text-danger',
        },
        {
          icon: <TrendingUp size={18} />,
          label: 'Chiffre d\'affaires',
          value: stats.chiffreAffairesTotal,
          format: formatPrice,
          accent: 'text-warning',
        },
      ]
    : []

  return (
    <div className="min-h-full">
      <PageHeader
        title="Tableau de bord"
        subtitle={`Vue d'ensemble — ${today}`}
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          : kpiCards.map((card, i) => (
              <StatCard
                key={card.label}
                icon={card.icon}
                label={card.label}
                value={card.value}
                format={card.format}
                accent={card.accent}
                delay={i * 0.06}
              />
            ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        {/* Bar chart — orders by status */}
        <ChartCard title="Commandes par statut" delay={0.38}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={ORDERS_BY_STATUS}
              margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
              barSize={28}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0ebe3"
              />
              <XAxis
                dataKey="statut"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#7a6a58', fontFamily: 'Inter, sans-serif' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#7a6a58', fontFamily: 'Inter, sans-serif' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE.contentStyle}
                cursor={TOOLTIP_STYLE.cursor}
                formatter={(value: number) => [value, 'Commandes']}
              />
              <Bar
                dataKey="count"
                fill="#c9762b"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Pie chart — role distribution */}
        <ChartCard title="Répartition des rôles" delay={0.44}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={ROLES_DATA}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {ROLES_DATA.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={TOOLTIP_STYLE.contentStyle}
                formatter={(value: number, name: string) => [value, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <CustomLegend />
        </ChartCard>
      </div>
    </div>
  )
}
