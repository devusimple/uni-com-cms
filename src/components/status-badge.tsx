import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { titleCase } from '@/lib/format'

const statusStyles: Record<string, string> = {
  active: 'border-success/30 bg-success/10 text-success',
  published: 'border-success/30 bg-success/10 text-success',
  fulfilled: 'border-success/30 bg-success/10 text-success',
  paid: 'border-info/30 bg-info/10 text-info',
  pending: 'border-warning/30 bg-warning/10 text-warning',
  draft: 'border-border bg-muted text-muted-foreground',
  archived: 'border-border bg-muted text-muted-foreground',
  cancelled: 'border-destructive/30 bg-destructive/10 text-destructive',
  inactive: 'border-destructive/30 bg-destructive/10 text-destructive',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn('font-medium capitalize', statusStyles[status])}
    >
      {titleCase(status)}
    </Badge>
  )
}
