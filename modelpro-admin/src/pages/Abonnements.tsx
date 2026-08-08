import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Crown, Search } from 'lucide-react'
import { abonnementsAdminApi, packsAdminApi } from '@/lib/api'
import type { AdminArtisan } from '@/lib/api'
import { Badge } from '@/components/shared/Badge'
import { TableSkeleton } from '@/components/shared/Skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn, formatDate } from '@/lib/utils'

const STATUT_LABELS: Record<string, string> = {
  essai: 'Essai',
  actif: 'Actif',
  expire: 'Expiré',
  inactif: 'Inactif',
}

function statutVariant(statut: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (statut === 'actif') return 'success'
  if (statut === 'essai') return 'warning'
  if (statut === 'expire') return 'danger'
  return 'neutral'
}

function getInitials(nom: string, prenom: string): string {
  return `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase()
}

const STATUT_FILTERS = [
  { value: undefined, label: 'Tous' },
  { value: 'essai', label: 'Essai' },
  { value: 'actif', label: 'Actif' },
  { value: 'expire', label: 'Expiré' },
  { value: 'inactif', label: 'Inactif' },
] as const

export default function Abonnements() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState<string | undefined>(undefined)
  const [packFilter, setPackFilter] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search, statutFilter, packFilter])

  const { data: packs = [] } = useQuery({
    queryKey: ['admin-packs'],
    queryFn: () => packsAdminApi.list().then(r => r.data),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-abonnements', page, search, statutFilter, packFilter],
    queryFn: () => abonnementsAdminApi.list({
      page, limit: 10,
      search: search || undefined,
      statutAbonnement: statutFilter,
      packId: packFilter,
    }).then(r => r.data),
    placeholderData: (prev) => prev,
  })

  const artisans: AdminArtisan[] = data?.data ?? []
  const meta = data ? { page: data.page, totalPages: data.totalPages, total: data.total, limit: data.limit } : undefined

  return (
    <div>
      <PageHeader
        title="Abonnements"
        subtitle="Pack et statut d'abonnement de chaque artisan"
      />

      {/* ── Filtres ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mr-1">Statut :</span>
          {STATUT_FILTERS.map(f => (
            <button
              key={f.label}
              onClick={() => setStatutFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                statutFilter === f.value
                  ? 'bg-brand-600 text-white shadow-card'
                  : 'bg-white text-ink-sub border border-surface-border hover:border-brand-300 hover:text-ink',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-ink-muted uppercase tracking-widest mr-1">Pack :</span>
            <button
              onClick={() => setPackFilter(undefined)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                packFilter === undefined
                  ? 'bg-brand-600 text-white shadow-card'
                  : 'bg-white text-ink-sub border border-surface-border hover:border-brand-300 hover:text-ink',
              )}
            >
              Tous
            </button>
            {packs.map(p => (
              <button
                key={p.id}
                onClick={() => setPackFilter(p.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                  packFilter === p.id
                    ? 'bg-brand-600 text-white shadow-card'
                    : 'bg-white text-ink-sub border border-surface-border hover:border-brand-300 hover:text-ink',
                )}
              >
                {p.nom}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher par atelier, nom, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-surface-border rounded-lg text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-300 transition"
            />
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">Artisan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">Pack</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">Statut</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">Date de fin</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="p-0"><TableSkeleton rows={6} cols={4} /></td></tr>
              ) : artisans.length === 0 ? (
                <tr><td colSpan={4}>
                  <EmptyState icon={Crown} title="Aucun abonnement" description="Aucun artisan ne correspond aux filtres sélectionnés." />
                </td></tr>
              ) : (
                artisans.map((artisan, i) => {
                  const user = artisan.user || { nom: 'Artisan', prenom: '', photoUrl: null }
                  const initials = getInitials(user.nom || 'A', user.prenom || '')
                  return (
                    <motion.tr
                      key={artisan.id}
                      className="border-b border-surface-border last:border-0 hover:bg-surface transition-colors duration-100 cursor-pointer"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      onClick={() => navigate(`/artisans/${artisan.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0 overflow-hidden">
                            {user.photoUrl ? (
                              <img src={user.photoUrl} alt={artisan.atelier} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-brand-700">{initials}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-ink truncate">{artisan.atelier}</p>
                            <p className="text-xs text-ink-muted truncate">{user.prenom} {user.nom}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {artisan.pack ? (
                          <Badge label={artisan.pack.nom} variant="default" />
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={STATUT_LABELS[artisan.statutAbonnement] ?? artisan.statutAbonnement}
                          variant={statutVariant(artisan.statutAbonnement)}
                        />
                      </td>
                      <td className="px-4 py-3 text-ink-sub">
                        {artisan.dateFinAbonnement ? formatDate(artisan.dateFinAbonnement) : <span className="text-ink-muted">—</span>}
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && meta && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </div>
  )
}
