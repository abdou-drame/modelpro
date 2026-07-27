import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PaginationMeta {
  page: number
  totalPages: number
  total: number
  limit: number
}

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ meta, onPageChange, className }: PaginationProps) {
  const { page, totalPages, total, limit } = meta
  if (totalPages <= 1) return null

  const from = (page - 1) * limit + 1
  const to = Math.min(page * limit, total)

  // Build page numbers with ellipsis
  function pages(): (number | '…')[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const result: (number | '…')[] = [1]
    if (page > 3) result.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      result.push(i)
    }
    if (page < totalPages - 2) result.push('…')
    result.push(totalPages)
    return result
  }

  return (
    <div className={cn('flex items-center justify-between gap-4 px-4 py-3 border-t border-surface-border', className)}>
      <p className="text-xs text-ink-muted hidden sm:block">
        <span className="font-semibold text-ink">{from}–{to}</span> sur{' '}
        <span className="font-semibold text-ink">{total}</span>
      </p>

      <div className="flex items-center gap-1 mx-auto sm:mx-0">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border text-ink-sub hover:border-brand-300 hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Page précédente"
        >
          <ChevronLeft size={14} />
        </button>

        {pages().map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-ink-muted select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors',
                p === page
                  ? 'bg-brand-600 text-white shadow-card'
                  : 'border border-surface-border text-ink-sub hover:border-brand-300 hover:text-ink'
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border text-ink-sub hover:border-brand-300 hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Page suivante"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <p className="text-xs text-ink-muted hidden sm:block">
        Page <span className="font-semibold text-ink">{page}</span> / {totalPages}
      </p>
    </div>
  )
}
