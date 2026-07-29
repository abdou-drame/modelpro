import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/shared/Badge'
import { TableSkeleton } from '@/components/shared/Skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { appointmentsAdminApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Pagination } from '@/components/shared/Pagination'

type AppointmentStatus = 'demande' | 'accepte' | 'confirme' | 'refuse' | 'termine'

const APPOINTMENT_STATUSES: AppointmentStatus[] = ['demande', 'accepte', 'confirme', 'refuse', 'termine']

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  demande: 'Demandé',
  accepte: 'Accepté',
  confirme: 'Confirmé',
  refuse: 'Refusé',
  termine: 'Terminé',
}

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  prise_mesures: 'Prise de mesures',
  essayage: 'Essayage',
  consultation: 'Consultation',
  livraison: 'Livraison',
  retouche: 'Retouche',
}

const appointmentTypeVariant = (type: string): 'default' | 'info' | 'warning' | 'success' | 'neutral' => {
  const map: Record<string, 'default' | 'info' | 'warning' | 'success' | 'neutral'> = {
    prise_mesures: 'default',
    essayage: 'info',
    consultation: 'warning',
    livraison: 'success',
    retouche: 'neutral',
  }
  return map[type] ?? 'neutral'
}

const appointmentStatusVariant = (status: string) => {
  const map: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'neutral'> = {
    demande: 'warning',
    accepte: 'info',
    confirme: 'success',
    refuse: 'danger',
    termine: 'neutral',
  }
  return map[status] ?? 'neutral'
}

function isUpcoming(dateStr: string): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  return diffMs > 0 && diffMs < 7 * 24 * 60 * 60 * 1000
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function Appointments() {
  const [statusFilter, setStatusFilter] = useState<string>('tous')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [statusFilter])

  const { data: apptData, isLoading } = useQuery({
    queryKey: ['admin', 'appointments', page],
    queryFn: () => appointmentsAdminApi.list({ page, limit: 10 }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })
  const appointments = Array.isArray(apptData) ? apptData : (apptData?.data ?? [])
  const paginationMeta = apptData ? { page: (apptData as any).page ?? 1, totalPages: (apptData as any).totalPages ?? 1, total: (apptData as any).total ?? appointments.length, limit: (apptData as any).limit ?? 10 } : null

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    APPOINTMENT_STATUSES.forEach((s) => { counts[s] = 0 })
    appointments.forEach((a) => {
      counts[a.statut] = (counts[a.statut] ?? 0) + 1
    })
    return counts
  }, [appointments])

  const filtered = useMemo(() => {
    const base =
      statusFilter === 'tous'
        ? appointments
        : appointments.filter((a) => a.statut === statusFilter)

    return [...base].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }, [appointments, statusFilter])

  return (
    <div className="p-6 max-w-screen-2xl mx-auto">
      <PageHeader
        title="Rendez-vous"
        subtitle="Suivi des rendez-vous entre clients et artisans"
      />

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
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
          <span className={cn(
            'ml-1.5 inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-semibold',
            statusFilter === 'tous' ? 'bg-white/20 text-white' : 'bg-surface-muted text-ink-sub'
          )}>
            {appointments.length}
          </span>
        </button>
        {APPOINTMENT_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border flex items-center gap-1.5',
              statusFilter === s
                ? 'bg-brand-600 text-white border-brand-600'
                : 'border-surface-border text-ink-sub hover:border-brand-300 hover:text-ink bg-white'
            )}
          >
            {APPOINTMENT_STATUS_LABELS[s]}
            {statusCounts[s] > 0 && (
              <span className={cn(
                'inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-semibold',
                statusFilter === s ? 'bg-white/20 text-white' : 'bg-surface-muted text-ink-sub'
              )}>
                {statusCounts[s]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden border border-surface-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Artisan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Date &amp; heure</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Statut</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <TableSkeleton rows={8} cols={6} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Calendar}
                      title="Aucun rendez-vous trouvé"
                      description="Aucun rendez-vous ne correspond au filtre sélectionné."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((appt) => {
                  const upcoming = isUpcoming(appt.date)
                  return (
                    <tr
                      key={appt.id}
                      className={cn(
                        'border-b border-surface-border hover:bg-surface transition-colors',
                        upcoming && 'border-l-2 border-l-brand-400'
                      )}
                    >
                      <td className="px-4 py-3 text-ink font-medium whitespace-nowrap">
                        {appt.client ? `${appt.client.prenom ?? ''} ${appt.client.nom ?? ''}`.trim() || 'Client' : 'Client'}
                      </td>
                      <td className="px-4 py-3 text-ink-sub whitespace-nowrap">
                        {appt.artisan?.atelier ?? 'Atelier'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={APPOINTMENT_TYPE_LABELS[appt.type] ?? appt.type}
                          variant={appointmentTypeVariant(appt.type)}
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn('text-sm', upcoming ? 'text-brand-600 font-semibold' : 'text-ink-sub')}>
                          {formatDateTime(appt.date)}
                        </span>
                        {upcoming && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-100 text-brand-700">
                            Bientôt
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          label={APPOINTMENT_STATUS_LABELS[appt.statut] ?? appt.statut}
                          variant={appointmentStatusVariant(appt.statut) as any}
                        />
                      </td>
                      <td className="px-4 py-3 text-ink-sub max-w-xs">
                        {appt.notes ? (
                          <span className="block truncate" title={appt.notes}>
                            {appt.notes.length > 60 ? `${appt.notes.slice(0, 60)}…` : appt.notes}
                          </span>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
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
    </div>
  )
}
