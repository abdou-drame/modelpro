import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, statusVariant } from '@/components/shared/Badge'
import { TableSkeleton } from '@/components/shared/Skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { ordersAdminApi, AdminOrder } from '@/lib/api'
import { cn, formatPrice, formatDate, ORDER_STATUS_LABELS } from '@/lib/utils'

const ALL_STATUSES = ['en_attente', 'acceptee', 'en_cours', 'en_finition', 'prete', 'livree', 'annulee'] as const

export default function Orders() {
  const [tab, setTab] = useState<'all' | 'overdue'>('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('tous')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search, statusFilter, tab])

  const { data: allData, isLoading: loadingAll } = useQuery({
    queryKey: ['admin', 'orders', { page, search, statusFilter }],
    queryFn: () => ordersAdminApi.list({ page, limit: 10 }).then((r) => r.data),
    placeholderData: (prev) => prev,
    enabled: tab === 'all',
  })

  const { data: overdueOrders = [], isLoading: loadingOverdue } = useQuery({
    queryKey: ['admin', 'orders', 'overdue'],
    queryFn: () => ordersAdminApi.overdue().then((r) => r.data),
    enabled: tab === 'overdue',
  })

  const isLoading = tab === 'all' ? loadingAll : loadingOverdue

  const allOrders = allData?.data ?? []
  const paginationMeta = tab === 'all' && allData
    ? { page: allData.page, totalPages: allData.totalPages, total: allData.total, limit: allData.limit }
    : null

  const baseOrders: AdminOrder[] = tab === 'all' ? allOrders : overdueOrders

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return baseOrders.filter((o) => {
      const matchSearch =
        !q ||
        `${o.client.prenom} ${o.client.nom}`.toLowerCase().includes(q) ||
        o.artisan.atelier.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'tous' || o.statut === statusFilter
      return matchSearch && matchStatus
    })
  }, [baseOrders, search, statusFilter])

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      <PageHeader
        title="Commandes"
        subtitle="Suivi de toutes les commandes de la plateforme"
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => { setTab('all'); setStatusFilter('tous') }}
          className={cn(
            'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
            tab === 'all'
              ? 'bg-white text-ink shadow-card'
              : 'text-ink-sub hover:text-ink'
          )}
        >
          Toutes
          <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-surface-border text-ink-sub text-xs">
            {paginationMeta?.total ?? allOrders.length}
          </span>
        </button>
        <button
          onClick={() => { setTab('overdue'); setStatusFilter('tous') }}
          className={cn(
            'px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5',
            tab === 'overdue'
              ? 'bg-white text-ink shadow-card'
              : 'text-ink-sub hover:text-ink'
          )}
        >
          <AlertTriangle size={14} className="text-warning" />
          En retard
          {overdueOrders.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
              {overdueOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Search + Status filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Rechercher client ou atelier…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-sm px-3 py-2 rounded-lg border border-surface-border bg-white text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <div className="flex flex-wrap gap-2">
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
          </button>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border',
                statusFilter === s
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-surface-border text-ink-sub hover:border-brand-300 hover:text-ink bg-white'
              )}
            >
              {ORDER_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden border border-surface-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">#ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Atelier / Métier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Modèle</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Montant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Statut</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Date commande</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Retard</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Livraison estimée</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-0">
                    <TableSkeleton rows={8} cols={9} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={ShoppingBag}
                      title="Aucune commande trouvée"
                      description="Ajustez les filtres ou la recherche pour afficher des résultats."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr
                    key={order.id}
                    className={cn(
                      'border-b border-surface-border hover:bg-surface transition-colors',
                      (order.estEnRetard || tab === 'overdue') && 'border-l-2 border-l-warning'
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-ink-sub text-xs">#{order.id}</td>
                    <td className="px-4 py-3 text-ink font-medium whitespace-nowrap">
                      {order.client.prenom} {order.client.nom}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-ink font-medium">{order.artisan.atelier}</span>
                      <span className="text-ink-muted text-xs block">{order.artisan.métier}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-sub">
                      {order.creation?.titre ?? <span className="text-ink-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-ink font-semibold whitespace-nowrap">
                      {formatPrice(order.prix)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={ORDER_STATUS_LABELS[order.statut] ?? order.statut}
                        variant={statusVariant(order.statut)}
                      />
                    </td>
                    <td className="px-4 py-3 text-ink-sub whitespace-nowrap">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3">
                      {order.estEnRetard ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700">
                          <AlertTriangle size={11} />
                          En retard
                        </span>
                      ) : (
                        <span className="text-ink-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-sub whitespace-nowrap">
                      {formatDate(order.dateLivraisonEstimee)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && paginationMeta && tab === 'all' && (
          <Pagination meta={paginationMeta} onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}
