import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Wallet, Hourglass, CheckCircle2, XCircle } from 'lucide-react'
import { walletAdminApi, AdminWithdrawal, WithdrawalStatus } from '@/lib/api'
import { Badge, statusVariant } from '@/components/shared/Badge'
import { TableSkeleton } from '@/components/shared/Skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Modal } from '@/components/shared/Modal'
import { cn, formatPrice, formatDate } from '@/lib/utils'

const STATUSES: { value: WithdrawalStatus; label: string }[] = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'valide', label: 'Validé' },
  { value: 'rejete', label: 'Rejeté' },
]

const MOYEN_LABELS: Record<string, string> = { wave: 'Wave', orange_money: 'Orange Money' }

export default function Retraits() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus | 'tous'>('en_attente')
  const [rejectTarget, setRejectTarget] = useState<AdminWithdrawal | null>(null)
  const [commentaire, setCommentaire] = useState('')

  const { data: retraits = [], isLoading } = useQuery({
    queryKey: ['admin-retraits'],
    queryFn: () => walletAdminApi.list().then((r) => r.data),
  })

  const { mutate: process, isPending } = useMutation({
    mutationFn: (data: { id: number; statut: 'valide' | 'rejete'; commentaireAdmin?: string }) =>
      walletAdminApi.process(data.id, { statut: data.statut, commentaireAdmin: data.commentaireAdmin }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-retraits'] })
      setRejectTarget(null)
      setCommentaire('')
    },
  })

  const filtered = useMemo(
    () => (statusFilter === 'tous' ? retraits : retraits.filter((r) => r.statut === statusFilter)),
    [retraits, statusFilter]
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = { en_attente: 0, valide: 0, rejete: 0 }
    retraits.forEach((r) => { c[r.statut] = (c[r.statut] ?? 0) + 1 })
    return c
  }, [retraits])

  const totalEnAttente = useMemo(
    () => retraits.filter((r) => r.statut === 'en_attente').reduce((s, r) => s + r.montant, 0),
    [retraits]
  )

  return (
    <div>
      <PageHeader
        title="Retraits artisans"
        subtitle="Demandes de retrait du solde wallet — reversement manuel via Wave / Orange Money"
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-8">
        <motion.div
          className="bg-white rounded-2xl p-5 shadow-card border border-surface-border"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">En attente</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Hourglass size={13} className="text-amber-700" />
            </div>
          </div>
          <p className="font-display font-bold text-xl text-ink tracking-tight leading-none">{formatPrice(totalEnAttente)}</p>
          <p className="text-[11px] text-ink-muted mt-1.5">{counts.en_attente} demande{counts.en_attente !== 1 ? 's' : ''}</p>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl p-5 shadow-card border border-surface-border"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">Validés</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 size={13} className="text-emerald-700" />
            </div>
          </div>
          <p className="font-display font-bold text-xl text-ink tracking-tight leading-none">{counts.valide}</p>
          <p className="text-[11px] text-ink-muted mt-1.5">Fonds envoyés</p>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl p-5 shadow-card border border-surface-border"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">Rejetés</span>
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
              <XCircle size={13} className="text-red-700" />
            </div>
          </div>
          <p className="font-display font-bold text-xl text-ink tracking-tight leading-none">{counts.rejete}</p>
          <p className="text-[11px] text-ink-muted mt-1.5">Solde recrédité</p>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl p-5 shadow-card border border-surface-border"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        >
          <div className="flex items-start justify-between mb-3">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">Total demandes</span>
            <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
              <Wallet size={13} className="text-brand-600" />
            </div>
          </div>
          <p className="font-display font-bold text-xl text-ink tracking-tight leading-none">{retraits.length}</p>
          <p className="text-[11px] text-ink-muted mt-1.5">Toutes périodes</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={() => setStatusFilter('tous')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
            statusFilter === 'tous'
              ? 'bg-brand-600 text-white shadow-card'
              : 'bg-white text-ink-sub border border-surface-border hover:border-brand-300 hover:text-ink'
          )}
        >
          Tous ({retraits.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
              statusFilter === s.value
                ? 'bg-brand-600 text-white shadow-card'
                : 'bg-white text-ink-sub border border-surface-border hover:border-brand-300 hover:text-ink'
            )}
          >
            {s.label} ({counts[s.value] ?? 0})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[52px_1.5fr_1fr_1.3fr_100px_140px_1fr] gap-4 px-5 py-3 border-b border-surface-border bg-surface-muted">
              {['#ID', 'Artisan', 'Montant', 'Réception', 'Statut', 'Date', 'Actions'].map((h) => (
                <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">{h}</span>
              ))}
            </div>

            {isLoading ? (
              <TableSkeleton rows={6} cols={7} />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Aucune demande de retrait"
                description="Aucune demande ne correspond au filtre sélectionné."
              />
            ) : (
              <div className="divide-y divide-surface-border">
                {filtered.map((r, i) => (
                  <motion.div
                    key={r.id}
                    className="grid grid-cols-[52px_1.5fr_1fr_1.3fr_100px_140px_1fr] gap-4 px-5 py-3.5 items-center hover:bg-surface transition-colors"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  >
                    <span className="text-xs font-mono text-ink-muted">#{r.id}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{r.artisan.atelier}</p>
                      <p className="text-xs text-ink-muted truncate">{r.artisan.user.prenom} {r.artisan.user.nom}</p>
                    </div>
                    <span className="text-sm font-bold text-ink tabular-nums">{formatPrice(r.montant)}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-ink-sub">{MOYEN_LABELS[r.moyenPaiement] ?? r.moyenPaiement}</p>
                      <p className="text-xs text-ink-muted truncate">{r.numeroReception}</p>
                    </div>
                    <Badge label={STATUSES.find((s) => s.value === r.statut)?.label ?? r.statut} variant={statusVariant(r.statut)} />
                    <span className="text-xs text-ink-muted tabular-nums">{formatDate(r.createdAt)}</span>
                    {r.statut === 'en_attente' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => process({ id: r.id, statut: 'valide' })}
                          disabled={isPending}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          Valider
                        </button>
                        <button
                          onClick={() => setRejectTarget(r)}
                          disabled={isPending}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-danger border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          Rejeter
                        </button>
                      </div>
                    ) : (
                      r.commentaireAdmin && (
                        <span className="text-xs text-ink-muted italic truncate" title={r.commentaireAdmin}>{r.commentaireAdmin}</span>
                      )
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={!!rejectTarget} onClose={() => { setRejectTarget(null); setCommentaire('') }} title="Rejeter la demande de retrait" size="sm">
        <p className="text-sm text-ink-sub mb-4">
          {rejectTarget && (
            <>Le solde de <span className="font-semibold text-ink">{formatPrice(rejectTarget.montant)}</span> sera recrédité automatiquement au wallet de l'artisan.</>
          )}
        </p>
        <textarea
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Motif du rejet (optionnel, visible par l'artisan)"
          rows={3}
          className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 mb-6 resize-none"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => { setRejectTarget(null); setCommentaire('') }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-ink-sub hover:bg-surface-muted transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => rejectTarget && process({ id: rejectTarget.id, statut: 'rejete', commentaireAdmin: commentaire || undefined })}
            disabled={isPending}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-danger hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isPending ? 'En cours...' : 'Rejeter'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
