export type QueryValue = string | number | boolean | null | undefined

export function toQueryString(params: object) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params) as Array<[string, QueryValue]>) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}
