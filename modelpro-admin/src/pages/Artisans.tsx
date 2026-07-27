import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Store, UserCheck } from 'lucide-react'
import { AdminArtisan, artisansAdminApi } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import { Badge, statusVariant } from '@/components/shared/Badge'
import { TableSkeleton } from '@/components/shared/Skeleton'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Pagination } from '@/components/shared/Pagination'

// ── Constants ─────────────────────────────────────────────────────────────────

const VALIDATION_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  valide: 'Validé',
  rejete: 'Rejeté',
}

const ABONNEMENT_LABELS: Record<string, string> = {
  actif: 'Actif',
  expire: 'Expiré',
  aucun: 'Aucun',
}

function abonnementVariant(statut: string) {
  if (statut === 'actif') return 'success' as const
  if (statut === 'expire') return 'danger' as const
  return 'neutral' as const
}

function getInitials(nom: string, prenom: string): string {
  return `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase()
}

// ── Tab animation variants ────────────────────────────────────────────────────

const TAB_CONTENT_VARIANTS = {
  enter: (dir: number) => ({
    x: dir * 24,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir * -24,
    opacity: 0,
  }),
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Artisans() {
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all')
  const [, setPrevTab] = useState<'all' | 'pending'>('all')
  const [rejectTarget, setRejectTarget] = useState<AdminArtisan | null>(null)
  const [rejectMotif, setRejectMotif] = useState('')
  const [verifyTarget, setVerifyTarget] = useState<AdminArtisan | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [activeTab])

  const direction = activeTab === 'pending' ? 1 : -1

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: artisansData, isLoading: loadingAll } = useQuery({
    queryKey: ['admin-artisans', page],
    queryFn: () => artisansAdminApi.list({ page, limit: 25 }).then((r) => r.data),
    placeholderData: (prev) => prev,
    enabled: activeTab === 'all',
  })
  const artisans = artisansData?.data ?? []
  const artisansMeta = artisansData ? { page: artisansData.page, totalPages: artisansData.totalPages, total: artisansData.total, limit: artisansData.limit } : null

  const { data: pending = [], isLoading: loadingPending } = useQuery({
    queryKey: ['admin-pending-artisans'],
    queryFn: () => artisansAdminApi.pending().then((r) => r.data),
  })

  const invalidateBoth = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-artisans'] })
    queryClient.invalidateQueries({ queryKey: ['admin-pending-artisans'] })
  }

  const verifyMutation = useMutation({
    mutationFn: (id: number) => artisansAdminApi.verify(id),
    onSuccess: () => {
      invalidateBoth()
      setVerifyTarget(null)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, motif }: { id: number; motif: string }) =>
      artisansAdminApi.reject(id, motif),
    onSuccess: () => {
      invalidateBoth()
      setRejectTarget(null)
      setRejectMotif('')
    },
  })

  // ── Tab switch ────────────────────────────────────────────────────────────

  const switchTab = (tab: 'all' | 'pending') => {
    if (tab === activeTab) return
    setPrevTab(activeTab)
    setActiveTab(tab)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Artisans"
        subtitle="Validation des profils et suivi des abonnements"
      />

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-surface-muted rounded-xl w-fit mb-6">
        <TabButton
          active={activeTab === 'all'}
          onClick={() => switchTab('all')}
          label="Tous les artisans"
        />
        <TabButton
          active={activeTab === 'pending'}
          onClick={() => switchTab('pending')}
          label="En attente"
          count={pending.length}
        />
      </div>

      {/* ── Animated tab content ──────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          {activeTab === 'all' ? (
            <motion.div
              key="all"
              custom={direction}
              variants={TAB_CONTENT_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <ArtisansTable
                artisans={artisans}
                isLoading={loadingAll}
                mode="all"
                emptyTitle="Aucun artisan enregistré"
                emptyDescription="Les artisans apparaîtront ici une fois inscrits."
                paginationMeta={artisansMeta ?? undefined}
                onPageChange={setPage}
              />
            </motion.div>
          ) : (
            <motion.div
              key="pending"
              custom={direction}
              variants={TAB_CONTENT_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <ArtisansTable
                artisans={pending}
                isLoading={loadingPending}
                mode="pending"
                emptyTitle="Aucune demande en attente"
                emptyDescription="Toutes les demandes de validation ont été traitées."
                onVerify={(a) => setVerifyTarget(a)}
                onReject={(a) => {
                  setRejectTarget(a)
                  setRejectMotif('')
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Verify confirm ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!verifyTarget}
        onClose={() => setVerifyTarget(null)}
        onConfirm={() => verifyTarget && verifyMutation.mutate(verifyTarget.id)}
        title="Valider cet artisan ?"
        description={`Le profil de ${verifyTarget?.atelier} sera marqué comme validé et visible sur la plateforme.`}
        confirmLabel="Valider"
        variant="primary"
        loading={verifyMutation.isPending}
      />

      {/* ── Reject modal ──────────────────────────────────────────────── */}
      <Modal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Rejeter la demande"
        size="md"
      >
        <p className="text-sm text-ink-sub mb-4">
          Indiquez le motif de rejet pour{' '}
          <span className="font-semibold text-ink">{rejectTarget?.atelier}</span>.
          Ce message sera communiqué à l'artisan.
        </p>
        <textarea
          value={rejectMotif}
          onChange={(e) => setRejectMotif(e.target.value)}
          placeholder="Ex. : Documents justificatifs manquants ou illisibles…"
          rows={4}
          className="w-full px-3 py-2.5 text-sm bg-surface border border-surface-border rounded-lg text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 resize-none transition"
        />
        <div className="flex gap-3 justify-end mt-5">
          <button
            onClick={() => setRejectTarget(null)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-ink-sub hover:bg-surface-muted transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() =>
              rejectTarget &&
              rejectMutation.mutate({ id: rejectTarget.id, motif: rejectMotif })
            }
            disabled={!rejectMotif.trim() || rejectMutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-danger hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {rejectMutation.isPending ? 'En cours...' : 'Rejeter'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── TabButton ─────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        active
          ? 'bg-white text-ink shadow-card'
          : 'text-ink-sub hover:text-ink'
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold',
            active ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-700'
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// ── ArtisansTable ─────────────────────────────────────────────────────────────

function ArtisansTable({
  artisans,
  isLoading,
  mode,
  emptyTitle,
  emptyDescription,
  onVerify,
  onReject,
  paginationMeta,
  onPageChange,
}: {
  artisans: AdminArtisan[]
  isLoading: boolean
  mode: 'all' | 'pending'
  emptyTitle: string
  emptyDescription: string
  onVerify?: (a: AdminArtisan) => void
  onReject?: (a: AdminArtisan) => void
  paginationMeta?: { page: number; totalPages: number; total: number; limit: number }
  onPageChange?: (page: number) => void
}) {
  const colCount = mode === 'pending' ? 7 : 6

  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface">
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">
                Atelier
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">
                Métier
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">
                Localisation
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">
                Note
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">
                Validation
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">
                Abonnement
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={colCount} className="p-0">
                  <TableSkeleton rows={6} cols={colCount} />
                </td>
              </tr>
            ) : artisans.length === 0 ? (
              <tr>
                <td colSpan={colCount}>
                  <EmptyState
                    icon={mode === 'pending' ? UserCheck : Store}
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              artisans.map((artisan) => (
                <ArtisanRow
                  key={artisan.id}
                  artisan={artisan}
                  mode={mode}
                  onVerify={onVerify}
                  onReject={onReject}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && paginationMeta && onPageChange && (
        <Pagination meta={paginationMeta} onPageChange={onPageChange} />
      )}
      {!isLoading && !paginationMeta && artisans.length > 0 && (
        <div className="px-4 py-3 border-t border-surface-border bg-surface">
          <p className="text-xs text-ink-muted">
            {artisans.length} artisan{artisans.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

// ── ArtisanRow ────────────────────────────────────────────────────────────────

function ArtisanRow({
  artisan,
  mode,
  onVerify,
  onReject,
}: {
  artisan: AdminArtisan
  mode: 'all' | 'pending'
  onVerify?: (a: AdminArtisan) => void
  onReject?: (a: AdminArtisan) => void
}) {
  const { user } = artisan
  const initials = getInitials(user.nom, user.prenom)

  return (
    <tr className="border-b border-surface-border last:border-0 hover:bg-surface transition-colors duration-100">
      {/* Atelier + avatar */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0 overflow-hidden">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={artisan.atelier}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-brand-700">{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-ink truncate">{artisan.atelier}</p>
            <p className="text-xs text-ink-muted truncate">
              {user.prenom} {user.nom}
            </p>
          </div>
        </div>
      </td>

      {/* Métier */}
      <td className="px-4 py-3">
        <Badge label={artisan.métier ?? '—'} variant="default" />
      </td>

      {/* Localisation */}
      <td className="px-4 py-3 text-ink-sub">
        {artisan.localisation ?? <span className="text-ink-muted">—</span>}
      </td>

      {/* Note */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="text-amber-500 text-sm leading-none">★</span>
          <span className="font-medium text-ink">
            {artisan.noteMoyenne && artisan.noteMoyenne > 0 ? artisan.noteMoyenne.toFixed(1) : '—'}
          </span>
          {artisan.nombreAvis > 0 && (
            <span className="text-xs text-ink-muted">/ {artisan.nombreAvis} avis</span>
          )}
        </div>
      </td>

      {/* Validation */}
      <td className="px-4 py-3">
        <Badge
          label={VALIDATION_LABELS[artisan.statutValidation] ?? artisan.statutValidation}
          variant={statusVariant(artisan.statutValidation)}
        />
      </td>

      {/* Abonnement */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <Badge
            label={ABONNEMENT_LABELS[artisan.statutAbonnement] ?? artisan.statutAbonnement}
            variant={abonnementVariant(artisan.statutAbonnement)}
          />
          {artisan.dateFinAbonnement && (
            <span className="text-xs text-ink-muted">
              exp. {formatDate(artisan.dateFinAbonnement)}
            </span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        {mode === 'pending' ? (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => onVerify?.(artisan)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              Valider
            </button>
            <button
              onClick={() => onReject?.(artisan)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
            >
              Rejeter
            </button>
          </div>
        ) : (
          <span className="text-xs text-ink-muted">
            {formatDate(user.createdAt)}
          </span>
        )}
      </td>
    </tr>
  )
}
