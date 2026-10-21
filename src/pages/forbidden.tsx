import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'

export function ForbiddenPage() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex size-11 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 text-destructive">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Access denied</h1>
            <p className="text-sm text-muted-foreground">
              Your account role ({user?.role ?? 'unknown'}) does not have access to this
              area.
            </p>
          </div>
          <Button asChild>
            <Link to="/">Back to overview</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
