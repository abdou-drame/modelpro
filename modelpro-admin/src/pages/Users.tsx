import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Users as UsersIcon } from 'lucide-react'
import { AdminUser, usersApi } from '@/lib/api'
import { cn, formatDate, USER_STATUS_LABELS } from '@/lib/utils'
import { Badge, statusVariant } from '@/components/shared/Badge'
import { TableSkeleton } from '@/components/shared/Skeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Pagination } from '@/components/shared/Pagination'

// ── Constants ────────────────────────────────────────────────────────────────

const ROLE_FILTERS = [
  { key: '', label: 'Tous' },
  { key: 'client', label: 'Client' },
  { key: 'artisan', label: 'Artisan' },
  { key: 'admin', label: 'Admin' },
] as const

const ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  artisan: 'Artisan',
  admin: 'Admin',
}

type RoleFilterKey = '' | 'client' | 'artisan' | 'admin'
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

function roleVariant(role: string): BadgeVariant {
  if (role === 'admin') return 'info'
  if (role === 'artisan') return 'default'
  return 'neutral'
}

function getInitials(nom: string, prenom: string): string {
  return `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase()
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Users() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilterKey>('')
  const [pendingToggle, setPendingToggle] = useState<AdminUser | null>(null)
  const [page, setPage] = useState(1)

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, roleFilter])

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', { search, role: roleFilter, page }],
    queryFn: () => usersApi.list({ search: search || undefined, role: roleFilter || undefined, page, limit: 25 }).then((r) => r.data),
    placeholderData: (prev) => prev,
  })
  const users = data?.data ?? []
  const paginationMeta = data ? { page: data.page, totalPages: data.totalPages, total: data.total, limit: data.limit } : null

  const toggleMutation = useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: 'actif' | 'suspendu' }) =>
      usersApi.setStatus(id, statut),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setPendingToggle(null)
    },
  })

  // Filtering is server-side; `users` is already the current page slice

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleConfirmToggle = () => {
    if (!pendingToggle) return
    const newStatut: 'actif' | 'suspendu' =
      pendingToggle.statut === 'actif' ? 'suspendu' : 'actif'
    toggleMutation.mutate({ id: pendingToggle.id, statut: newStatut })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Utilisateurs"
        subtitle="Gérez les comptes clients, artisans et administrateurs"
        action={
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-brand-100 text-brand-700 text-sm font-semibold">
            {paginationMeta?.total ?? users.length} utilisateur{(paginationMeta?.total ?? users.length) !== 1 ? 's' : ''}
          </span>
        }
      />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
          />
          <input
            type="text"
            placeholder="Nom, email, téléphone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-surface-border rounded-lg text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-300 transition"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r.key}
              onClick={() => setRoleFilter(r.key as RoleFilterKey)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                roleFilter === r.key
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white border border-surface-border text-ink-sub hover:bg-surface-muted hover:text-ink'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface">
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">
                  Utilisateur
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">
                  Téléphone
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">
                  Rôle
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">
                  Statut
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">
                  Inscription
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-ink-sub uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <TableSkeleton rows={8} cols={7} />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={UsersIcon}
                      title="Aucun utilisateur trouvé"
                      description={
                        search || roleFilter
                          ? 'Essayez de modifier vos critères de recherche.'
                          : 'Aucun utilisateur enregistré pour le moment.'
                      }
                    />
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onToggle={() => setPendingToggle(user)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && paginationMeta && (
          <Pagination meta={paginationMeta} onPageChange={setPage} />
        )}
      </div>

      {/* ── Confirm dialog ──────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!pendingToggle}
        onClose={() => setPendingToggle(null)}
        onConfirm={handleConfirmToggle}
        title={
          pendingToggle?.statut === 'actif'
            ? 'Suspendre cet utilisateur ?'
            : 'Réactiver cet utilisateur ?'
        }
        description={
          pendingToggle?.statut === 'actif'
            ? `${pendingToggle.prenom} ${pendingToggle.nom} ne pourra plus se connecter tant que son compte est suspendu.`
            : `${pendingToggle?.prenom} ${pendingToggle?.nom} retrouvera l'accès complet à son compte.`
        }
        confirmLabel={pendingToggle?.statut === 'actif' ? 'Suspendre' : 'Réactiver'}
        variant={pendingToggle?.statut === 'actif' ? 'danger' : 'primary'}
        loading={toggleMutation.isPending}
      />
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UserRow({
  user,
  onToggle,
}: {
  user: AdminUser
  onToggle: () => void
}) {
  const initials = getInitials(user.nom, user.prenom)

  return (
    <tr className="border-b border-surface-border last:border-0 hover:bg-surface transition-colors duration-100">
      {/* Avatar + name */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0 overflow-hidden">
            {user.photoUrl ? (
              <img
                src={user.photoUrl}
                alt={`${user.prenom} ${user.nom}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-brand-700">{initials}</span>
            )}
          </div>
          <span className="font-medium text-ink">
            {user.prenom} {user.nom}
          </span>
        </div>
      </td>

      {/* Email */}
      <td className="px-4 py-3 text-ink-sub">{user.email}</td>

      {/* Téléphone */}
      <td className="px-4 py-3 text-ink-sub">{user.telephone}</td>

      {/* Rôle */}
      <td className="px-4 py-3">
        <Badge
          label={ROLE_LABELS[user.role] ?? user.role}
          variant={roleVariant(user.role)}
        />
      </td>

      {/* Statut */}
      <td className="px-4 py-3">
        <Badge
          label={USER_STATUS_LABELS[user.statut] ?? user.statut}
          variant={statusVariant(user.statut)}
        />
      </td>

      {/* Inscription */}
      <td className="px-4 py-3 text-ink-sub">{formatDate(user.createdAt)}</td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        <button
          onClick={onToggle}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
            user.statut === 'actif'
              ? 'bg-red-50 text-red-700 hover:bg-red-100'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          )}
        >
          {user.statut === 'actif' ? 'Suspendre' : 'Activer'}
        </button>
      </td>
    </tr>
  )
}
