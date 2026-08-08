import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CreditCard, Pencil, Loader2 } from 'lucide-react'
import { packsAdminApi } from '@/lib/api'
import type { Pack } from '@/lib/api'
import { Badge } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/Skeleton'
import { PageHeader } from '@/components/layout/PageHeader'
import { formatPrice, cn } from '@/lib/utils'

// ── Form state ─────────────────────────────────────────────────────────────────

interface PackFormValues {
  nom: string
  prixMensuel: string
  prixAnnuel: string
  limiteModelesActifs: string // vide = illimité
  actif: boolean
}

interface FormErrors {
  nom?: string
  prixMensuel?: string
  prixAnnuel?: string
  limiteModelesActifs?: string
}

function validateForm(values: PackFormValues): FormErrors {
  const errors: FormErrors = {}
  if (!values.nom.trim()) errors.nom = 'Le nom est requis.'
  if (!values.prixMensuel || Number(values.prixMensuel) <= 0) errors.prixMensuel = 'Prix mensuel invalide.'
  if (!values.prixAnnuel || Number(values.prixAnnuel) <= 0) errors.prixAnnuel = 'Prix annuel invalide.'
  if (values.limiteModelesActifs.trim() && Number(values.limiteModelesActifs) < 0) {
    errors.limiteModelesActifs = 'La limite doit être positive (laisser vide = illimité).'
  }
  return errors
}

function toForm(pack: Pack): PackFormValues {
  return {
    nom: pack.nom,
    prixMensuel: String(pack.prixMensuel),
    prixAnnuel: String(pack.prixAnnuel),
    limiteModelesActifs: pack.limiteModelesActifs === null ? '' : String(pack.limiteModelesActifs),
    actif: pack.actif,
  }
}

// ── Inline field ───────────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  type?: string
  placeholder?: string
}

function Field({ label, value, onChange, error, type = 'text', placeholder }: FieldProps) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-ink-sub">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-xl bg-surface border text-sm text-ink transition-all',
          'placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-500/30',
          error ? 'border-danger focus:border-danger' : 'border-surface-border focus:border-brand-400',
        )}
      />
      {error && <p className="text-[11px] text-danger font-medium">{error}</p>}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'relative inline-flex w-9 h-5 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
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

export default function Packs() {
  const queryClient = useQueryClient()

  const [editTarget, setEditTarget] = useState<Pack | null>(null)
  const [form, setForm] = useState<PackFormValues>({ nom: '', prixMensuel: '', prixAnnuel: '', limiteModelesActifs: '', actif: true })
  const [formErrors, setFormErrors] = useState<FormErrors>({})

  const { data: packs = [], isLoading } = useQuery({
    queryKey: ['admin-packs'],
    queryFn: () => packsAdminApi.list().then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Pack> }) => packsAdminApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packs'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      handleClose()
    },
  })

  function openEdit(pack: Pack) {
    setEditTarget(pack)
    setForm(toForm(pack))
    setFormErrors({})
  }

  function handleClose() {
    setEditTarget(null)
    setFormErrors({})
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors = validateForm(form)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    if (!editTarget) return
    updateMutation.mutate({
      id: editTarget.id,
      data: {
        nom: form.nom,
        prixMensuel: Number(form.prixMensuel),
        prixAnnuel: Number(form.prixAnnuel),
        limiteModelesActifs: form.limiteModelesActifs.trim() === '' ? null : Number(form.limiteModelesActifs),
        actif: form.actif,
      },
    })
  }

  return (
    <div>
      <PageHeader
        title="Packs d'abonnement"
        subtitle="Prix et limites des packs Essentiel / Pro / Business — modifiables sans déploiement"
      />

      <div className="bg-white rounded-2xl shadow-card border border-surface-border overflow-hidden">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_100px_110px] gap-4 px-5 py-3 border-b border-surface-border bg-surface-muted">
          {['Pack', 'Prix mensuel', 'Prix annuel', 'Limite modèles', 'Statut', 'Actions'].map(h => (
            <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">{h}</span>
          ))}
        </div>

        {isLoading ? (
          <TableSkeleton rows={3} cols={6} />
        ) : packs.length === 0 ? (
          <EmptyState icon={CreditCard} title="Aucun pack" description="Les packs sont créés automatiquement au démarrage du serveur." />
        ) : (
          <div className="divide-y divide-surface-border">
            {packs.map((pack, i) => (
              <motion.div
                key={pack.id}
                className="grid grid-cols-[1.2fr_1fr_1fr_1fr_100px_110px] gap-4 px-5 py-4 items-center hover:bg-surface transition-colors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <span className="font-display font-semibold text-ink text-sm">{pack.nom}</span>
                <span className="text-sm text-ink-sub">{formatPrice(pack.prixMensuel)}</span>
                <span className="text-sm text-ink-sub">{formatPrice(pack.prixAnnuel)}</span>
                <span className="text-sm text-ink-sub">
                  {pack.limiteModelesActifs === null ? (
                    <span className="italic text-ink-muted">Illimité</span>
                  ) : (
                    `${pack.limiteModelesActifs} modèles`
                  )}
                </span>
                <Badge label={pack.actif ? 'Actif' : 'Inactif'} variant={pack.actif ? 'success' : 'neutral'} />
                <button
                  onClick={() => openEdit(pack)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-sub hover:bg-surface-muted hover:text-ink transition-colors w-fit"
                  aria-label={`Modifier ${pack.nom}`}
                >
                  <Pencil size={12} />
                  Modifier
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={editTarget !== null}
        onClose={() => !updateMutation.isPending && handleClose()}
        title={editTarget ? `Modifier "${editTarget.nom}"` : ''}
        size="sm"
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field label="Nom du pack" value={form.nom} onChange={v => setForm(f => ({ ...f, nom: v }))} error={formErrors.nom} />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Prix mensuel (FCFA)"
              type="number"
              value={form.prixMensuel}
              onChange={v => setForm(f => ({ ...f, prixMensuel: v }))}
              error={formErrors.prixMensuel}
            />
            <Field
              label="Prix annuel (FCFA)"
              type="number"
              value={form.prixAnnuel}
              onChange={v => setForm(f => ({ ...f, prixAnnuel: v }))}
              error={formErrors.prixAnnuel}
            />
          </div>
          <Field
            label="Limite de modèles actifs"
            type="number"
            value={form.limiteModelesActifs}
            onChange={v => setForm(f => ({ ...f, limiteModelesActifs: v }))}
            error={formErrors.limiteModelesActifs}
            placeholder="Laisser vide = illimité"
          />

          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-ink-sub">Pack visible / proposable</span>
            <Toggle checked={form.actif} onChange={() => setForm(f => ({ ...f, actif: !f.actif }))} />
          </div>

          {updateMutation.isError && (
            <p className="text-xs text-danger bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              Une erreur est survenue. Veuillez réessayer.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={updateMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium text-ink-sub hover:bg-surface-muted transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-card transition-all disabled:opacity-50"
            >
              {updateMutation.isPending && <Loader2 size={13} className="animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
