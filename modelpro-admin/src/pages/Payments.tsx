import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Banknote, Receipt, TrendingUp } from 'lucide-react'
import { paymentsAdminApi } from '@/lib/api'
import { Badge, statusVariant } from '@/components/shared/Badge'
import { TableSkeleton } from '@/components/shared/Skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn, formatPrice, formatDate } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const PAYMENT_TYPES = [
  { value: 'acompte',      label: 'Acompte' },
  { value: 'solde',        label: 'Solde' },
  { value: 'integral',     label: 'Intégral' },
  { value: 'abonnement',   label: 'Abonnement' },
  { value: 'frais_service', label: 'Frais service' },
] as const

const PAYMENT_MOYENS = [
  { value: 'wave',         label: 'Wave',         icon: '📱' },
  { value: 'orange_money', label: 'Orange Money',  icon: '🟠' },
  { value: 'free_money',   label: 'Free Money',   icon: '💚' },
  { value: 'especes',      label: 'Espèces',      icon: '💵' },
] as const

type TypeValue  = typeof PAYMENT_TYPES[number]['value']
type MoyenValue = typeof PAYMENT_MOYENS[number]['value']

const TYPE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  acompte:      'warning',
  solde:        'success',
  integral:     'info',
  abonnement:   'default',
  frais_service:'neutral',
}

function typeLabel(type: string): string {
  return PAYMENT_TYPES.find(t => t.value === type)?.label ?? type
}

function moyenInfo(moyen: string) {
  return PAYMENT_MOYENS.find(m => m.value === moyen) ?? { label: moyen, icon: '' }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Payments() {
  const [filterType, setFilterType]   = useState<TypeValue | null>(null)
  const [filterMoyen, setFilterMoyen] = useState<MoyenValue | null>(null)

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn:  () => paymentsAdminApi.list().then(r => r.data),
  })

  // ── KPI computations (whole dataset, not filtered) ─────────────────────────

  const totalCA = useMemo(
    () => payments.filter(p => p.statut === 'confirme').reduce((s, p) => s + p.montant, 0),
    [payments],
  )
  const totalTransactions = payments.length

  const moyenBreakdown = useMemo(() =>
    PAYMENT_MOYENS.map(m => ({
      ...m,
      count: payments.filter(p => p.moyen === m.value).length,
    })),
  [payments])

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = useMemo(() =>
    payments.filter(p => {
      if (filterType  && p.type  !== filterType)  return false
      if (filterMoyen && p.moyen !== filterMoyen) return false
      return true
    }),
  [payments, filterType, filterMoyen])

  const filteredTotal = useMemo(
    () => filtered.reduce((s, p) => s + p.montant, 0),
    [filtered],
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Paiements"
        subtitle={`${totalTransactions} transaction${totalTransactions !== 1 ? 's' : ''} enregistrée${totalTransactions !== 1 ? 's' : ''}`}
      />

      {/* ── KPI row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[2fr_2fr_1fr_1fr_1fr_1fr] mb-8">

        {/* Total CA */}
        <motion.div
          className="col-span-1 bg-white rounded-2xl p-5 shadow-card border border-surface-border"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">Chiffre d'affaires</span>
            <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
              <TrendingUp size={13} className="text-brand-600" />
            </div>
          </div>
          <p className="font-display font-bold text-xl text-ink tracking-tight leading-none">{formatPrice(totalCA)}</p>
          <p className="text-[11px] text-ink-muted mt-1.5">Paiements confirmés</p>
        </motion.div>

        {/* Total transactions */}
        <motion.div
          className="col-span-1 bg-white rounded-2xl p-5 shadow-card border border-surface-border"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">Transactions</span>
            <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
              <Receipt size={13} className="text-brand-600" />
            </div>
          </div>
          <p className="font-display font-bold text-xl text-ink tracking-tight leading-none">{totalTransactions}</p>
          <p className="text-[11px] text-ink-muted mt-1.5">Total enregistrées</p>
        </motion.div>

        {/* Moyen breakdown chips */}
        {moyenBreakdown.map((m, i) => (
          <motion.div
            key={m.value}
            className="bg-white rounded-2xl p-4 shadow-card border border-surface-border flex flex-col justify-between"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.03 }}
          >
            <span className="text-lg leading-none mb-2">{m.icon}</span>
            <p className="font-display font-bold text-lg text-ink leading-none">{m.count}</p>
            <p className="text-[11px] font-medium text-ink-sub mt-1 truncate">{m.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mr-1">Type :</span>
        {PAYMENT_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setFilterType(filterType === t.value ? null : t.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
              filterType === t.value
                ? 'bg-brand-600 text-white shadow-card'
                : 'bg-white text-ink-sub border border-surface-border hover:border-brand-300 hover:text-ink',
            )}
          >
            {t.label}
          </button>
        ))}

        <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mx-1">Moyen :</span>
        {PAYMENT_MOYENS.map(m => (
          <button
            key={m.value}
            onClick={() => setFilterMoyen(filterMoyen === m.value ? null : m.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
              filterMoyen === m.value
                ? 'bg-brand-600 text-white shadow-card'
                : 'bg-white text-ink-sub border border-surface-border hover:border-brand-300 hover:text-ink',
            )}
          >
            <span>{m.icon}</span>
            {m.label}
          </button>
        ))}

        {(filterType || filterMoyen) && (
          <button
            onClick={() => { setFilterType(null); setFilterMoyen(null) }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-danger hover:bg-red-50 transition-colors"
          >
            Effacer les filtres
          </button>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">

            {/* Header */}
            <div className="grid grid-cols-[52px_1fr_1fr_130px_110px_160px_88px_96px] gap-4 px-5 py-3 border-b border-surface-border bg-surface-muted">
              {['#ID', 'Artisan', 'Commande', 'Montant', 'Type', 'Moyen', 'Statut', 'Date'].map(h => (
                <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">{h}</span>
              ))}
            </div>

            {/* Body */}
            {isLoading ? (
              <TableSkeleton rows={8} cols={8} />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Banknote}
                title="Aucun paiement"
                description="Aucun paiement ne correspond aux filtres sélectionnés."
              />
            ) : (
              <div className="divide-y divide-surface-border">
                {filtered.map((p, i) => {
                  const info = moyenInfo(p.moyen)
                  return (
                    <motion.div
                      key={p.id}
                      className="grid grid-cols-[52px_1fr_1fr_130px_110px_160px_88px_96px] gap-4 px-5 py-3.5 items-center hover:bg-surface transition-colors"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                    >
                      <span className="text-xs font-mono text-ink-muted">#{p.id}</span>
                      <span className="text-sm font-medium text-ink truncate">{p.artisan.atelier}</span>
                      <span className="text-sm text-ink-sub truncate">
                        {p.orderId ? `Commande #${p.orderId}` : 'Abonnement'}
                      </span>
                      <span className="text-sm font-bold text-ink tabular-nums">{formatPrice(p.montant)}</span>
                      <Badge label={typeLabel(p.type)} variant={TYPE_VARIANT[p.type] ?? 'neutral'} />
                      <span className="flex items-center gap-1.5 text-sm text-ink-sub">
                        <span className="text-base leading-none">{info.icon}</span>
                        <span className="truncate">{info.label}</span>
                      </span>
                      <Badge label={p.statut} variant={statusVariant(p.statut)} />
                      <span className="text-xs text-ink-muted tabular-nums">{formatDate(p.createdAt)}</span>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Footer total */}
            {!isLoading && filtered.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-surface-border bg-surface-muted">
                <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">
                  Total — {filtered.length} ligne{filtered.length !== 1 ? 's' : ''}
                </span>
                <span className="font-display font-bold text-ink tabular-nums">{formatPrice(filteredTotal)}</span>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
