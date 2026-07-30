import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Star, MapPin, Clock, Award, Package,
  MessageSquare, CheckCircle, XCircle, Calendar, Trash2, Crown,
} from 'lucide-react'
import { artisansAdminApi, reviewsAdminApi, AdminReview } from '@/lib/api'
import { Badge, statusVariant } from '@/components/shared/Badge'
import { Skeleton } from '@/components/shared/Skeleton'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatDate, formatPrice } from '@/lib/utils'
import { useState } from 'react'

// ── Sub-note bar ───────────────────────────────────────────────────────────────

function NoteBar({ label, value }: { label: string; value: number | null }) {
  if (!value) return null
  const pct = Math.round((value / 5) * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-ink-sub w-32 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-brand-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-semibold text-ink w-6 text-right">{value}</span>
    </div>
  )
}

// ── Review card ────────────────────────────────────────────────────────────────

function ReviewCard({ review, onDelete }: { review: AdminReview; onDelete: (id: number) => void }) {
  const initials = `${review.client?.prenom?.[0] ?? ''}${review.client?.nom?.[0] ?? ''}`.toUpperCase()
  return (
    <div className="bg-white border border-surface-border rounded-xl p-4 relative group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0 overflow-hidden">
            {review.client?.photoUrl
              ? <img src={review.client.photoUrl} alt="" className="w-full h-full object-cover" />
              : <span className="text-xs font-bold text-brand-700">{initials}</span>
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-ink leading-none">
              {review.client ? `${review.client.prenom ?? ''} ${review.client.nom ?? ''}`.trim() || 'Client' : 'Client'}
            </p>
            <p className="text-[11px] text-ink-muted mt-0.5">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={13}
                className={i < review.note ? 'text-amber-400 fill-amber-400' : 'text-surface-border'}
              />
            ))}
          </div>
          <button
            onClick={() => onDelete(review.id)}
            title="Supprimer cet avis"
            className="p-1 text-ink-muted hover:text-danger hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {review.commentaire && (
        <p className="text-sm text-ink-sub leading-relaxed mb-3">{review.commentaire}</p>
      )}

      <div className="space-y-1.5">
        <NoteBar label="Qualité" value={review.noteQualite} />
        <NoteBar label="Délai" value={review.noteDelai} />
        <NoteBar label="Communication" value={review.noteCommunication} />
        <NoteBar label="Prix" value={review.notePrix} />
        <NoteBar label="Professionnalisme" value={review.noteProfessionnalisme} />
      </div>
    </div>
  )
}

// ── Model card mini ────────────────────────────────────────────────────────────

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #fae8d8 0%, #eba875 100%)',
  'linear-gradient(135deg, #f4ccaa 0%, #c9762b 100%)',
  'linear-gradient(135deg, #fdf6f0 0%, #f4ccaa 100%)',
  'linear-gradient(135deg, #eba875 0%, #8b3a0f 100%)',
]

// ── Page ───────────────────────────────────────────────────────────────────────

const VALIDATION_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  valide: 'Validé',
  rejete: 'Rejeté',
}

const ABONNEMENT_LABELS: Record<string, string> = {
  actif: 'Actif',
  expire: 'Expiré',
  inactif: 'Inactif',
}

export default function ArtisanProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const artisanId = Number(id)

  const [showVerify, setShowVerify] = useState(false)
  const [showReject, setShowReject] = useState(false)
  const [rejectMotif, setRejectMotif] = useState('')

  const { data: artisan, isLoading } = useQuery({
    queryKey: ['admin-artisan-profile', artisanId],
    queryFn: () => artisansAdminApi.profile(artisanId).then(r => r.data),
    enabled: !!artisanId,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-artisan-profile', artisanId] })
    queryClient.invalidateQueries({ queryKey: ['admin-artisans'] })
    queryClient.invalidateQueries({ queryKey: ['admin-pending-artisans'] })
    queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
  }

  const [deleteReviewId, setDeleteReviewId] = useState<number | null>(null)
  const [showDeleteArtisan, setShowDeleteArtisan] = useState(false)

  const subscriptionMutation = useMutation({
    mutationFn: (days: number = 30) => artisansAdminApi.updateSubscription(artisanId, { statutAbonnement: 'actif', days }),
    onSuccess: () => {
      invalidate()
      alert('Abonnement activé avec succès pour 30 jours !')
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erreur lors de l'activation de l'abonnement.")
    },
  })

  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: number) => reviewsAdminApi.delete(reviewId),
    onSuccess: () => { invalidate(); setDeleteReviewId(null) },
  })

  const deleteArtisanMutation = useMutation({
    mutationFn: () => artisansAdminApi.delete(artisanId),
    onSuccess: () => { invalidate(); navigate('/artisans') },
  })

  const suspendMutation = useMutation({
    mutationFn: () => artisansAdminApi.suspend(artisanId),
    onSuccess: () => invalidate(),
  })

  const reactivateMutation = useMutation({
    mutationFn: () => artisansAdminApi.reactivate(artisanId),
    onSuccess: () => invalidate(),
  })

  const verifyMutation = useMutation({
    mutationFn: () => artisansAdminApi.verify(artisanId),
    onSuccess: () => { invalidate(); setShowVerify(false) },
  })

  const rejectMutation = useMutation({
    mutationFn: () => artisansAdminApi.reject(artisanId, rejectMotif),
    onSuccess: () => { invalidate(); setShowReject(false); setRejectMotif('') },
  })

  if (isLoading) return <ProfileSkeleton />
  if (!artisan) return (
    <div className="p-8 text-center text-ink-sub">
      Artisan introuvable.
      <button onClick={() => navigate('/artisans')} className="block mx-auto mt-4 text-brand-600 underline text-sm">
        Retour à la liste
      </button>
    </div>
  )

  const { user, catalogue = [], reviews = [] } = artisan
  const photosAtelier: string[] = artisan.photosAtelier
    ? JSON.parse(artisan.photosAtelier).filter(Boolean)
    : []

  const avgNote = artisan.noteMoyenne && artisan.noteMoyenne > 0
    ? artisan.noteMoyenne.toFixed(1)
    : null

  return (
    <div className="max-w-screen-xl mx-auto p-6">
      {/* Back */}
      <button
        onClick={() => navigate('/artisans')}
        className="flex items-center gap-2 text-sm text-ink-sub hover:text-ink transition-colors mb-6 group"
      >
        <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
        Retour aux artisans
      </button>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white rounded-2xl shadow-card border border-surface-border p-6 mb-6"
      >
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-brand-100 flex items-center justify-center shrink-0 overflow-hidden border border-surface-border">
            {user.photoUrl
              ? <img src={user.photoUrl} alt={artisan.atelier} className="w-full h-full object-cover" />
              : <span className="text-2xl font-black text-brand-700">
                  {`${user.prenom?.[0] ?? ''}${user.nom?.[0] ?? ''}`.toUpperCase()}
                </span>
            }
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start gap-2 mb-1">
              <h1 className="font-display font-black text-xl text-ink tracking-tight">{artisan.atelier}</h1>
              <Badge label={VALIDATION_LABELS[artisan.statutValidation] ?? artisan.statutValidation} variant={statusVariant(artisan.statutValidation)} />
              <Badge
                label={ABONNEMENT_LABELS[artisan.statutAbonnement] ?? artisan.statutAbonnement}
                variant={artisan.statutAbonnement === 'actif' ? 'success' : artisan.statutAbonnement === 'expire' ? 'danger' : 'neutral'}
              />
            </div>
            <p className="text-ink-sub text-sm">{user.prenom} {user.nom}</p>
            <p className="text-brand-600 text-sm font-semibold mt-0.5">{artisan.métier}</p>

            <div className="flex flex-wrap gap-4 mt-3 text-xs text-ink-sub">
              {artisan.localisation && (
                <span className="flex items-center gap-1"><MapPin size={12} />{artisan.localisation}</span>
              )}
              {artisan.zone && (
                <span className="flex items-center gap-1"><MapPin size={12} />Zone : {artisan.zone}</span>
              )}
              {artisan.experience && (
                <span className="flex items-center gap-1"><Award size={12} />{artisan.experience} ans d'expérience</span>
              )}
              {avgNote && (
                <span className="flex items-center gap-1.5">
                  <Star size={12} className="text-amber-400 fill-amber-400" />
                  <span className="font-semibold text-ink">{avgNote}</span>
                  <span>/ {artisan.nombreAvis} avis</span>
                </span>
              )}
              {artisan.dateFinAbonnement && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />Abonnement expire le {formatDate(artisan.dateFinAbonnement)}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            {artisan.statutValidation === 'en_attente' && (
              <>
                <button
                  onClick={() => setShowVerify(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle size={15} />
                  Valider
                </button>
                <button
                  onClick={() => setShowReject(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors border border-red-200"
                >
                  <XCircle size={15} />
                  Rejeter
                </button>
              </>
            )}
            {artisan.statutValidation === 'valide' && (
              <>
                <button
                  onClick={() => subscriptionMutation.mutate(30)}
                  disabled={subscriptionMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-50"
                  title="Activer ou prolonger l'abonnement de 30 jours"
                >
                  <Crown size={15} />
                  {subscriptionMutation.isPending ? 'Activation…' : 'Activer Abonnement (+30j)'}
                </button>

                {artisan.user?.statut === 'suspendu' ? (
                  <button
                    onClick={() => reactivateMutation.mutate()}
                    disabled={reactivateMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200 disabled:opacity-50"
                  >
                    <CheckCircle size={15} />
                    {reactivateMutation.isPending ? 'En cours…' : 'Réactiver'}
                  </button>
                ) : (
                  <button
                    onClick={() => suspendMutation.mutate()}
                    disabled={suspendMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors border border-amber-200 disabled:opacity-50"
                  >
                    <XCircle size={15} />
                    {suspendMutation.isPending ? 'En cours…' : 'Suspendre'}
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => setShowDeleteArtisan(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
            >
              <Trash2 size={15} />
              Supprimer
            </button>
          </div>
        </div>

        {/* Description */}
        {artisan.description && (
          <div className="mt-5 pt-5 border-t border-surface-border">
            <p className="text-sm text-ink-sub leading-relaxed">{artisan.description}</p>
          </div>
        )}

        {/* Motif rejet */}
        {artisan.statutValidation === 'rejete' && artisan.motifRejet && (
          <div className="mt-4 border-l-2 border-danger pl-4 py-1">
            <p className="text-xs font-semibold text-danger uppercase tracking-wide mb-0.5">Motif de rejet</p>
            <p className="text-sm text-ink-sub">{artisan.motifRejet}</p>
          </div>
        )}

        {/* Horaires */}
        {artisan.horaires && (
          <div className="mt-4 flex items-start gap-2 text-sm text-ink-sub">
            <Clock size={14} className="shrink-0 mt-0.5 text-ink-muted" />
            <p>{artisan.horaires}</p>
          </div>
        )}
      </motion.div>

      {/* Photos atelier */}
      {photosAtelier.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6"
        >
          <h2 className="font-display font-bold text-ink text-base mb-3">Photos de l'atelier</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photosAtelier.map((url, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden bg-surface-muted border border-surface-border">
                <img src={url} alt={`Atelier ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main grid: catalogue + reviews */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">

        {/* Catalogue */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Package size={16} className="text-brand-600" />
            <h2 className="font-display font-bold text-ink text-base">
              Catalogue
              {catalogue.length > 0 && (
                <span className="ml-2 text-xs font-normal text-ink-muted">{catalogue.length} modèle{catalogue.length > 1 ? 's' : ''}</span>
              )}
            </h2>
          </div>

          {catalogue.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-border p-8 text-center text-ink-sub text-sm">
              Aucun modèle publié
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogue.map((model, i) => (
                <div key={model.id} className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
                  <div className="aspect-[4/3] overflow-hidden">
                    {model.photoUrl
                      ? <img src={model.photoUrl} alt={model.titre} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full" style={{ background: FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length] }} />
                    }
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm text-ink truncate">{model.titre}</p>
                    {model.categorie && (
                      <p className="text-xs text-ink-muted mt-0.5 capitalize">{model.categorie}</p>
                    )}
                    {model.prixEstimatif && (
                      <p className="text-xs font-bold text-brand-600 mt-1">{formatPrice(model.prixEstimatif)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-brand-600" />
            <h2 className="font-display font-bold text-ink text-base">
              Avis clients
              {reviews.length > 0 && (
                <span className="ml-2 text-xs font-normal text-ink-muted">{reviews.length} avis</span>
              )}
            </h2>
          </div>

          {reviews.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-border p-8 text-center text-ink-sub text-sm">
              Aucun avis pour le moment
            </div>
          ) : (
            <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
              {reviews.map(r => <ReviewCard key={r.id} review={r} onDelete={setDeleteReviewId} />)}
            </div>
          )}
        </motion.div>
      </div>

      {/* Contact info footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mt-6 bg-white rounded-2xl border border-surface-border shadow-card p-5"
      >
        <h2 className="font-display font-bold text-ink-muted text-sm mb-4 uppercase tracking-widest">Informations de contact</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">Téléphone</p>
            <p className="text-ink">{user.telephone}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">Email</p>
            <p className="text-ink">{user.email}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-muted mb-1">Compte créé le</p>
            <p className="text-ink">{formatDate(user.createdAt)}</p>
          </div>
        </div>
      </motion.div>

      {/* Dialogs */}
      <ConfirmDialog
        open={showVerify}
        onClose={() => setShowVerify(false)}
        onConfirm={() => verifyMutation.mutate()}
        title="Valider cet artisan ?"
        description={`Le profil de ${artisan.atelier} sera marqué comme validé et visible sur la plateforme.`}
        confirmLabel="Valider"
        variant="primary"
        loading={verifyMutation.isPending}
      />

      <Modal open={showReject} onClose={() => setShowReject(false)} title={artisan.statutValidation === 'valide' ? 'Révoquer la validation' : 'Rejeter la demande'} size="md">
        <p className="text-sm text-ink-sub mb-4">
          Indiquez le motif pour{' '}
          <span className="font-semibold text-ink">{artisan.atelier}</span>.
          Ce message sera communiqué à l'artisan.
        </p>
        <textarea
          value={rejectMotif}
          onChange={e => setRejectMotif(e.target.value)}
          placeholder="Ex. : Documents justificatifs manquants ou illisibles…"
          rows={4}
          className="w-full px-3 py-2.5 text-sm bg-surface border border-surface-border rounded-lg text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 resize-none transition"
        />
        <div className="flex gap-3 justify-end mt-5">
          <button onClick={() => setShowReject(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-ink-sub hover:bg-surface-muted transition-colors">
            Annuler
          </button>
          <button
            onClick={() => rejectMutation.mutate()}
            disabled={!rejectMotif.trim() || rejectMutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-danger hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {rejectMutation.isPending ? 'En cours…' : artisan.statutValidation === 'valide' ? 'Révoquer' : 'Rejeter'}
          </button>
        </div>
      </Modal>

      {/* Confirm delete review */}
      <Modal
        open={deleteReviewId !== null}
        onClose={() => setDeleteReviewId(null)}
        title="Supprimer cet avis ?"
      >
        <p className="text-sm text-ink-sub mb-4">
          Cet avis sera <strong>définitivement effacé</strong> de la plateforme. Cette action est irréversible.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setDeleteReviewId(null)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-sub bg-surface hover:bg-surface-hover transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => deleteReviewId && deleteReviewMutation.mutate(deleteReviewId)}
            disabled={deleteReviewMutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleteReviewMutation.isPending ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </div>
      </Modal>

      {/* Confirm delete artisan */}
      <Modal
        open={showDeleteArtisan}
        onClose={() => setShowDeleteArtisan(false)}
        title="Supprimer cet artisan ?"
      >
        <p className="text-sm text-ink-sub mb-4">
          Le profil artisan <strong>{artisan.atelier}</strong> et son compte utilisateur seront <strong>définitivement supprimés</strong> de la plateforme. Cette action est irréversible.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setShowDeleteArtisan(false)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-ink-sub bg-surface hover:bg-surface-hover transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => deleteArtisanMutation.mutate()}
            disabled={deleteArtisanMutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleteArtisanMutation.isPending ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="max-w-screen-xl mx-auto p-6 space-y-6 animate-shimmer">
      <Skeleton className="h-4 w-32" />
      <div className="bg-white rounded-2xl border border-surface-border p-6">
        <div className="flex gap-5">
          <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-surface-border overflow-hidden">
              <Skeleton className="w-full aspect-[4/3]" />
              <div className="p-3 space-y-1.5">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
