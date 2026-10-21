import { ApiError } from '@/lib/api/client'

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return error.message || 'You do not have permission to perform this action.'
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred. Please try again.'
}
