import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/shared/Badge'
import { TableSkeleton } from '@/components/shared/Skeleton'
import { claimsAdminApi } from '@/lib/api'
import { cn, formatDate, CLAIM_STATUS_LABELS } from '@/lib/utils'

type ClaimStatus = 'en_attente' | 'en_cours' | 'resolu' | 'rejete'

const CLAIM_STATUSES: ClaimStatus[] = ['en_attente', 'en_cours', 'resolu', 'rejete']

const claimStatusVariant = (status: string) => {
  const map: Record<string, 'warning' | 'info' | 'success' | 'danger'> = {
    en_attente: 'warning',
    en_cours: 'info',
    resolu: 'success',
    rejete: 'danger',
  }
  return map[status] ?? 'neutral'
}

const selectClasses =
  'text-xs font-semibold rounded border px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-300 transition-colors cursor-pointer appearance-none pr-6 bg-no-repeat'

const selectStyle = (status: string): string => {
  const styles: Record<string, string> = {
    en_attente: 'bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-300',
    en_cours: 'bg-sky-50 text-sky-700 border-sky-200 focus:ring-sky-300',
    resolu: 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-300',
    rejete: 'bg-red-50 text-red-700 border-red-200 focus:ring-red-300',
  }
  return styles[status] ?? 'bg-surface-muted text-ink-sub border-surface-border'
}

export default function Claims() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('tous')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<number, string>>({})

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['admin', 'claims'],
    queryFn: () => claimsAdminApi.list().then((r) => r.data),
  })

  const { mutate: setStatus } = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) =>
      claimsAdminApi.setStatus(id, statut),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'claims'] })
    },
    onError: (_err, { id }) => {
      setOptimisticStatuses((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    },
  })

  const handleStatusChange = (id: number, statut: string) => {
    setOptimisticStatuses((prev) => ({ ...prev, [id]: statut }))
    setStatus({ id, statut })
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    CLAIM_STATUSES.forEach((s) => { counts[s] = 0 })
    claims.forEach((c) => {
      const s = optimisticStatuses[c.id] ?? c.statut
      counts[s] = (counts[s] ?? 0) + 1
    })
    return counts
  }, [claims, optimisticStatuses])

  const filtered = useMemo(() => {
    return statusFilter === 'tous'
      ? claims
      : claims.filter((c) => (optimisticStatuses[c.id] ?? c.statut) === statusFilter)
  }, [claims, statusFilter, optimisticStatuses])

  const toggleRow = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      <PageHeader
        title="Réclamations"
        subtitle="Gestion et résolution des réclamations clients"
      />

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setStatusFilter('tous')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
            statusFilter === 'tous'
              ? 'bg-brand-600 text-white border-brand-600'
              : 'border-surface-border text-ink-sub hover:border-brand-300 hover:text-ink bg-white'
          )}
        >
          Tous
          <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-white/20 text-[10px]">
            {claims.length}
          </span>
        </button>
        {CLAIM_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border flex items-center gap-1.5',
              statusFilter === s
                ? 'bg-brand-600 text-white border-brand-600'
                : 'border-surface-border text-ink-sub hover:border-brand-300 hover:text-ink bg-white'
            )}
          >
            {CLAIM_STATUS_LABELS[s]}
            {statusCounts[s] > 0 && (
              <span className={cn(
                'inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-semibold',
                statusFilter === s ? 'bg-white/20 text-white' : 'bg-surface-muted text-ink-sub'
              )}>
                {statusCounts[s]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden border border-surface-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider w-8"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">#ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Atelier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Sujet</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Statut</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <TableSkeleton rows={8} cols={7} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <p className="font-display font-semibold text-ink text-base">Aucune réclamation</p>
                      <p className="text-ink-sub text-sm mt-1">Aucune réclamation ne correspond au filtre sélectionné.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((claim) => {
                  const currentStatus = optimisticStatuses[claim.id] ?? claim.statut
                  const isExpanded = expandedId === claim.id

                  return (
                    <>
                      <tr
                        key={`row-${claim.id}`}
                        onClick={() => toggleRow(claim.id)}
                        className={cn(
                          'border-b border-surface-border cursor-pointer transition-colors',
                          isExpanded ? 'bg-surface' : 'hover:bg-surface'
                        )}
                      >
                        <td className="px-3 py-3 text-ink-muted">
                          {isExpanded
                            ? <ChevronDown size={14} />
                            : <ChevronRight size={14} />
                          }
                        </td>
                        <td className="px-4 py-3 font-mono text-ink-sub text-xs">#{claim.id}</td>
                        <td className="px-4 py-3 text-ink font-medium whitespace-nowrap">
                          {claim.client.user.prenom} {claim.client.user.nom}
                        </td>
                        <td className="px-4 py-3 text-ink-sub whitespace-nowrap">
                          {claim.order.artisan.nomAtelier}
                        </td>
                        <td className="px-4 py-3 text-ink max-w-xs">
                          <span className="block truncate" title={claim.sujet}>
                            {claim.sujet.length > 50 ? `${claim.sujet.slice(0, 50)}…` : claim.sujet}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="relative inline-block">
                            <select
                              value={currentStatus}
                              onChange={(e) => handleStatusChange(claim.id, e.target.value)}
                              className={cn(selectClasses, selectStyle(currentStatus))}
                              style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='currentColor' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                                backgroundPosition: 'right 6px center',
                              }}
                            >
                              {CLAIM_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {CLAIM_STATUS_LABELS[s]}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-sub whitespace-nowrap">{formatDate(claim.createdAt)}</td>
                      </tr>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <tr key={`detail-${claim.id}`} className="border-b border-surface-border">
                            <td colSpan={7} className="px-0 py-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.22, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="px-12 py-4 bg-surface border-l-4 border-l-brand-200">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-1">
                                      <p className="text-xs font-semibold text-ink-sub uppercase tracking-wider mb-1.5">
                                        Description
                                      </p>
                                      <p className="text-sm text-ink leading-relaxed">{claim.description}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                      <p className="text-xs text-ink-muted">Commande #{claim.order.id}</p>
                                      <Badge
                                        label={CLAIM_STATUS_LABELS[currentStatus] ?? currentStatus}
                                        variant={claimStatusVariant(currentStatus) as any}
                                        className="mt-1"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
