import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500 && error.status !== 429) {
          return false
        }
        return failureCount < 1
      },
    },
    mutations: {
      retry: false,
    },
  },
})
