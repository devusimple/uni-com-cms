import DOMPurify from 'dompurify'

export const PRODUCT_DESCRIPTION_MAX_LENGTH = 5000

const ALLOWED_TAGS = [
  'p',
  'div',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'ul',
  'ol',
  'li',
]

export function sanitizeProductDescription(value: string): string {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
  }).trim()
}

export function isProductDescriptionEmpty(value: string): boolean {
  if (!value.trim()) return true
  const document = new DOMParser().parseFromString(value, 'text/html')
  return (document.body.textContent ?? '').replace(/\u00a0/g, ' ').trim() === ''
}

export function normalizeProductDescription(value: string): string | null {
  const sanitized = sanitizeProductDescription(value)
  return isProductDescriptionEmpty(sanitized) ? null : sanitized
}

export function hasProductDescriptionMarkup(value: string): boolean {
  return /<\/?[a-z][^>]*>/i.test(value)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function toProductDescriptionEditorValue(value: string | null): string {
  if (!value?.trim()) return ''
  if (hasProductDescriptionMarkup(value)) return sanitizeProductDescription(value)

  return value
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}
