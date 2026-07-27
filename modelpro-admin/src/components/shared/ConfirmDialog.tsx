import { Modal } from './Modal'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  variant?: 'danger' | 'primary'
  loading?: boolean
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirmer', variant = 'primary', loading }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-ink-sub mb-6">{description}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-ink-sub hover:bg-surface-muted transition-colors">
          Annuler
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
            variant === 'danger' ? 'bg-danger hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'
          }`}
        >
          {loading ? 'En cours...' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
