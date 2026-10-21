import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pluralize } from '@/lib/format'

interface PaginationProps {
  page: number
  pageSize: number
  itemCount: number
  onPageChange: (page: number) => void
}

export function Pagination({
  page,
  pageSize,
  itemCount,
  onPageChange,
}: PaginationProps) {
  const from = itemCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = (page - 1) * pageSize + itemCount

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>
        {itemCount === 0
          ? 'No results on this page'
          : `${from}–${to} · ${pluralize(itemCount, 'result')} on this page`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Previous
        </Button>
        <span className="px-2 text-xs font-medium text-foreground">Page {page}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={itemCount < pageSize}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
