import { cn } from '@/lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const variants: Record<Variant, string> = {
  default:  'bg-brand-100 text-brand-700',
  success:  'bg-emerald-50 text-emerald-700',
  warning:  'bg-amber-50 text-amber-700',
  danger:   'bg-red-50 text-red-700',
  info:     'bg-sky-50 text-sky-700',
  neutral:  'bg-surface-muted text-ink-sub',
}

export function Badge({ label, variant = 'default', className }: {
  label: string; variant?: Variant; className?: string
}) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide',
      variants[variant], className
    )}>
      {label}
    </span>
  )
}

export function statusVariant(status: string): Variant {
  const map: Record<string, Variant> = {
    actif: 'success', suspendu: 'danger', inactif: 'neutral',
    valide: 'success', en_attente: 'warning', rejete: 'danger',
    livree: 'success', annulee: 'danger', prete: 'info',
    en_cours: 'default', acceptee: 'default', en_finition: 'warning',
    resolu: 'success', rejete2: 'danger', en_cours2: 'warning',
    confirme: 'success', echoue: 'danger', rembourse: 'info',
  }
  return map[status] ?? 'neutral'
}
