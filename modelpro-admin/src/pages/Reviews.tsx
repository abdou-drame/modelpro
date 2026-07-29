import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Search, Trash2, MessageSquare } from 'lucide-react'
import { reviewsAdminApi, AdminReview } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { PageHeader } from '@/components/layout/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/Skeleton'
import { Pagination } from '@/components/shared/Pagination'

export default function Reviews() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null)

  useEffect(() => { setPage(1) }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', page, search],
    queryFn: () => reviewsAdminApi.list({ page, limit: 10, search: search || undefined }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const reviews = Array.isArray(data) ? data : (data?.data ?? [])
  const paginationMeta = data
    ? { page: (data as any).page ?? 1, totalPages: (data as any).totalPages ?? 1, total: (data as any).total ?? reviews.length, limit: (data as any).limit ?? 10 }
    : null

  const deleteMutation = useMutation({
    mutationFn: (id: number) => reviewsAdminApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
      setDeleteTarget(null)
    },
  })

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      <PageHeader
        title="Avis et Évaluations"
        subtitle="Consultez et modérez les avis laissés par les clients aux artisans"
      />

      {/* Filter / Search */}
      <div className="mb-6 max-w-sm relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher par client, atelier ou commentaire..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-surface-border rounded-lg text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden border border-surface-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Artisan / Atelier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Note</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Commentaire</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <TableSkeleton rows={6} cols={6} />
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={MessageSquare}
                      title="Aucun avis trouvé"
                      description={search ? "Aucun avis ne correspond à votre recherche." : "Aucun avis publié pour le moment."}
                    />
                  </td>
                </tr>
              ) : (
                reviews.map((r) => {
                  const clientName = `${r.client?.prenom ?? ''} ${r.client?.nom ?? ''}`.trim() || 'Client'
                  const artisanName = r.artisan?.atelier || `${r.artisan?.user?.prenom ?? ''} ${r.artisan?.user?.nom ?? ''}`.trim() || 'Artisan'

                  return (
                    <tr key={r.id} className="border-b border-surface-border last:border-0 hover:bg-surface transition-colors">
                      <td className="px-4 py-3 font-medium text-ink">{clientName}</td>
                      <td className="px-4 py-3 text-ink-sub">{artisanName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-amber-500 font-semibold">
                          <Star size={14} className="fill-amber-400" />
                          <span>{r.note}/5</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-sub max-w-md truncate">{r.commentaire || '—'}</td>
                      <td className="px-4 py-3 text-ink-muted text-xs">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="Supprimer définitivement cet avis"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && paginationMeta && (
          <Pagination meta={paginationMeta} onPageChange={setPage} />
        )}
      </div>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="Supprimer cet avis ?"
        description="Cet avis sera définitivement supprimé et retiré de la moyenne de l'artisan. Cette action est irréversible."
        confirmLabel="Supprimer l'avis"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
