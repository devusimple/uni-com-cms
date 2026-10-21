import {
  hasProductDescriptionMarkup,
  isProductDescriptionEmpty,
  sanitizeProductDescription,
} from '@/lib/product-description'
import { cn } from '@/lib/utils'

interface ProductDescriptionProps {
  value: string | null
  className?: string
}

export function ProductDescription({ value, className }: ProductDescriptionProps) {
  if (!value?.trim()) return null

  if (!hasProductDescriptionMarkup(value)) {
    return (
      <p className={cn('whitespace-pre-line text-sm leading-6', className)}>
        {value}
      </p>
    )
  }

  const html = sanitizeProductDescription(value)
  if (isProductDescriptionEmpty(html)) return null

  return (
    <div
      className={cn('rich-text-content text-sm leading-6', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
