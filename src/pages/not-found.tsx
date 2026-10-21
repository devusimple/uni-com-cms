import { FileQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="flex size-11 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
            <FileQuestion className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Page not found</h1>
            <p className="text-sm text-muted-foreground">
              The page you are looking for does not exist or has moved.
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
