import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Search, Trash2 } from 'lucide-react'
import { modelsAdminApi } from '@/lib/api'
import { Badge } from '@/components/shared/Badge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/shared/Skeleton'
import { cn, formatPrice, formatDate } from '@/lib/utils'

// ── Warm-gradient fallback for missing images ──────────────────────────────────

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #fae8d8 0%, #eba875 100%)',
  'linear-gradient(135deg, #f4ccaa 0%, #c9762b 100%)',
  'linear-gradient(135deg, #fdf6f0 0%, #f4ccaa 100%)',
  'linear-gradient(135deg, #eba875 0%, #8b3a0f 100%)',
  'linear-gradient(135deg, #fae8d8 0%, #c9762b 80%)',
]

function gradientForId(id: number): string {
  return FALLBACK_GRADIENTS[id % FALLBACK_GRADIENTS.length]
}

// ── Model card skeleton ───────────────────────────────────────────────────────

function ModelCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-surface-border overflow-hidden">
      <Skeleton className="w-full aspect-[4/3]" />
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Catalogue() {
  const queryClient = useQueryClient()
  const [search,       setSearch]       = useState('')
  const [activeCategory, setCategory]   = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  const { data: models = [], isLoading } = useQuery({
    queryKey: ['admin-models'],
    queryFn:  () => modelsAdminApi.list().then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => modelsAdminApi.delete(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['admin-models'] })
      setDeleteTarget(null)
    },
  })

  // ── Derived data ────────────────────────────────────────────────────────────

  const categories = useMemo(() => {
    const set = new Set<string>()
    models.forEach(m => { if (m.categorie) set.add(m.categorie) })
    return Array.from(set).sort()
  }, [models])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return models.filter(m => {
      const matchSearch = !q
        || m.titre.toLowerCase().includes(q)
        || m.artisan.nomAtelier.toLowerCase().includes(q)
      const matchCat = !activeCategory || m.categorie === activeCategory
      return matchSearch && matchCat
    })
  }, [models, search, activeCategory])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Catalogue"
        subtitle={`${models.length} modèle${models.length !== 1 ? 's' : ''} publié${models.length !== 1 ? 's' : ''}`}
      />

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par titre ou artisan…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-surface-border rounded-xl text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
          />
        </div>

        {/* Category chips */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setCategory(null)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
              activeCategory === null
                ? 'bg-brand-600 text-white shadow-card'
                : 'bg-white text-ink-sub border border-surface-border hover:border-brand-300 hover:text-ink',
            )}
          >
            Tous
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(activeCategory === cat ? null : cat)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 capitalize',
                activeCategory === cat
                  ? 'bg-brand-600 text-white shadow-card'
                  : 'bg-white text-ink-sub border border-surface-border hover:border-brand-300 hover:text-ink',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <ModelCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Palette}
          title="Aucun modèle"
          description={
            search || activeCategory
              ? 'Aucun modèle ne correspond à votre recherche.'
              : 'Le catalogue est vide pour l\'instant.'
          }
        />
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
        >
          {filtered.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              onDelete={() => setDeleteTarget(model.id)}
            />
          ))}
        </motion.div>
      )}

      {/* ── Confirm delete ───────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
        onConfirm={() => deleteTarget !== null && deleteMutation.mutate(deleteTarget)}
        title="Supprimer ce modèle"
        description="Cette action est irréversible. Le modèle sera définitivement supprimé du catalogue."
        confirmLabel="Supprimer"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

// ── Model card component ──────────────────────────────────────────────────────

interface ModelCardProps {
  model: {
    id: number
    titre: string
    photoUrl: string | null
    prixEstimatif: number | null
    categorie: string | null
    artisan: { nomAtelier: string }
    createdAt: string
  }
  onDelete: () => void
}

function ModelCard({ model, onDelete }: ModelCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      className="group bg-white rounded-2xl shadow-card border border-surface-border overflow-hidden"
      variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
      whileHover={{ y: -3, boxShadow: '0 4px 24px 0 rgba(139,58,15,0.10), 0 1px 4px 0 rgba(139,58,15,0.06)' }}
      transition={{ type: 'spring', stiffness: 340, damping: 24 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      {/* Image */}
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        {model.photoUrl ? (
          <img
            src={model.photoUrl}
            alt={model.titre}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: gradientForId(model.id) }}
          >
            <span
              className="font-display font-black text-4xl select-none"
              style={{ color: 'rgba(139,58,15,0.22)', WebkitTextStroke: '1.5px rgba(139,58,15,0.18)' }}
            >
              {model.titre.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Delete button — appears on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.button
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-white/95 shadow-lifted flex items-center justify-center text-danger hover:bg-red-50 transition-colors"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              aria-label={`Supprimer ${model.titre}`}
            >
              <Trash2 size={14} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="font-display font-semibold text-ink text-sm leading-snug truncate">{model.titre}</p>
        <p className="text-xs text-ink-sub mt-0.5 truncate">{model.artisan.nomAtelier}</p>

        <div className="flex items-center justify-between mt-3">
          {model.prixEstimatif !== null ? (
            <span className="font-display font-bold text-brand-600 text-sm tabular-nums">
              {formatPrice(model.prixEstimatif)}
            </span>
          ) : (
            <span className="text-xs text-ink-muted italic">Prix non renseigné</span>
          )}
          {model.categorie ? (
            <Badge label={model.categorie} variant="neutral" className="capitalize" />
          ) : (
            <Badge label="Sans catégorie" variant="neutral" />
          )}
        </div>

        <p className="text-[11px] text-ink-muted mt-2.5">Ajouté le {formatDate(model.createdAt)}</p>
      </div>
    </motion.div>
  )
}
