import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Scissors, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { metiersAdminApi } from '@/lib/api'
import type { Metier } from '@/lib/api'
import { Badge } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/Skeleton'
import { PageHeader } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'

// ── Form state ─────────────────────────────────────────────────────────────────

interface MetierFormValues {
  nom:         string
  description: string
}

interface FormErrors {
  nom?:         string
  description?: string
}

function validateForm(values: MetierFormValues): FormErrors {
  const errors: FormErrors = {}
  if (!values.nom.trim())         errors.nom         = 'Le nom est requis.'
  if (!values.description.trim()) errors.description = 'La description est requise.'
  return errors
}

const EMPTY_FORM: MetierFormValues = { nom: '', description: '' }

// ── Inline label input ─────────────────────────────────────────────────────────

interface FieldProps {
  label:       string
  value:       string
  onChange:    (v: string) => void
  error?:      string
  multiline?:  boolean
  placeholder?: string
}

function Field({ label, value, onChange, error, multiline, placeholder }: FieldProps) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  const base = cn(
    'w-full px-3.5 py-2.5 rounded-xl bg-surface border text-sm text-ink transition-all',
    'placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30',
    error
      ? 'border-danger focus:border-danger'
      : 'border-surface-border focus:border-brand-400',
  )
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-ink-sub">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(base, 'resize-none')}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={base}
        />
      )}
      {error && (
        <p className="text-[11px] text-danger font-medium">{error}</p>
      )}
    </div>
  )
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

interface ToggleProps {
  checked:  boolean
  onChange: () => void
  loading?: boolean
}

function Toggle({ checked, onChange, loading }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={loading}
      className={cn(
        'relative inline-flex w-9 h-5 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-60',
        checked ? 'bg-brand-600' : 'bg-surface-border',
      )}
    >
      <span
        className={cn(
          'inline-block w-3.5 h-3.5 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]',
        )}
      />
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Metiers() {
  const queryClient = useQueryClient()

  // Modal state
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editTarget,  setEditTarget]  = useState<Metier | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Metier | null>(null)

  // Form state
  const [form,         setForm]       = useState<MetierFormValues>(EMPTY_FORM)
  const [formErrors,   setFormErrors] = useState<FormErrors>({})

  // Toggling in-flight tracking
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: metiers = [], isLoading } = useQuery({
    queryKey: ['metiers'],
    queryFn:  () => metiersAdminApi.list().then(r => r.data),
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: MetierFormValues) => metiersAdminApi.create(data),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['metiers'] })
      handleCloseModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: MetierFormValues }) =>
      metiersAdminApi.update(id, data),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['metiers'] })
      handleCloseModal()
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: number) => metiersAdminApi.toggle(id),
    onMutate:   (id) => setTogglingId(id),
    onSettled:  () => {
      setTogglingId(null)
      queryClient.invalidateQueries({ queryKey: ['metiers'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => metiersAdminApi.delete(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['metiers'] })
      setDeleteTarget(null)
    },
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setModalOpen(true)
  }

  function openEdit(metier: Metier) {
    setEditTarget(metier)
    setForm({ nom: metier.nom, description: metier.description })
    setFormErrors({})
    setModalOpen(true)
  }

  function handleCloseModal() {
    setModalOpen(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors = validateForm(form)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const mutationPending = createMutation.isPending || updateMutation.isPending

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Métiers"
        subtitle={`${metiers.length} métier${metiers.length !== 1 ? 's' : ''} enregistré${metiers.length !== 1 ? 's' : ''}`}
        action={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-card hover:shadow-lifted transition-all duration-150 active:scale-[0.98]"
          >
            <Plus size={15} />
            Nouveau métier
          </button>
        }
      />

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card border border-surface-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_2fr_120px_110px] gap-4 px-5 py-3 border-b border-surface-border bg-surface-muted">
          {['Nom', 'Description', 'Statut', 'Actions'].map(h => (
            <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">{h}</span>
          ))}
        </div>

        {/* Body */}
        {isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : metiers.length === 0 ? (
          <EmptyState
            icon={Scissors}
            title="Aucun métier"
            description="Créez le premier métier disponible sur la plateforme."
          />
        ) : (
          <div className="divide-y divide-surface-border">
            {metiers.map((metier, i) => (
              <motion.div
                key={metier.id}
                className="grid grid-cols-[1fr_2fr_120px_110px] gap-4 px-5 py-4 items-center hover:bg-surface transition-colors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                {/* Nom */}
                <span className="font-display font-semibold text-ink text-sm">{metier.nom}</span>

                {/* Description — truncated */}
                <p className="text-sm text-ink-sub truncate" title={metier.description}>
                  {metier.description || <span className="italic text-ink-muted">—</span>}
                </p>

                {/* Statut + toggle */}
                <div className="flex items-center gap-2.5">
                  <Toggle
                    checked={metier.actif}
                    onChange={() => toggleMutation.mutate(metier.id)}
                    loading={togglingId === metier.id}
                  />
                  <Badge
                    label={metier.actif ? 'Actif' : 'Inactif'}
                    variant={metier.actif ? 'success' : 'neutral'}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEdit(metier)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-sub hover:bg-surface-muted hover:text-ink transition-colors"
                    aria-label={`Modifier ${metier.nom}`}
                  >
                    <Pencil size={12} />
                    Modifier
                  </button>
                  <button
                    onClick={() => setDeleteTarget(metier)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-danger hover:bg-red-50 transition-colors"
                    aria-label={`Supprimer ${metier.nom}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => !mutationPending && handleCloseModal()}
        title={editTarget ? `Modifier "${editTarget.nom}"` : 'Nouveau métier'}
        size="sm"
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field
            label="Nom du métier"
            value={form.nom}
            onChange={v => { setForm(f => ({ ...f, nom: v })); setFormErrors(e => ({ ...e, nom: undefined })) }}
            error={formErrors.nom}
            placeholder="Ex. Couturier, Brodeur, Tisserand…"
          />
          <Field
            label="Description"
            value={form.description}
            onChange={v => { setForm(f => ({ ...f, description: v })); setFormErrors(e => ({ ...e, description: undefined })) }}
            error={formErrors.description}
            multiline
            placeholder="Décrivez les activités liées à ce métier…"
          />

          {/* Mutation error */}
          {(createMutation.isError || updateMutation.isError) && (
            <p className="text-xs text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              Une erreur est survenue. Veuillez réessayer.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={mutationPending}
              className="px-4 py-2 rounded-lg text-sm font-medium text-ink-sub hover:bg-surface-muted transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={mutationPending}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-card transition-all disabled:opacity-50"
            >
              {mutationPending && <Loader2 size={13} className="animate-spin" />}
              {editTarget ? 'Enregistrer' : 'Créer le métier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm delete ───────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => !deleteMutation.isPending && setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title={`Supprimer "${deleteTarget?.nom}"`}
        description="Ce métier sera définitivement supprimé. Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
