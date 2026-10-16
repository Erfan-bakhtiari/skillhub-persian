import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { DirectionProvider } from '@radix-ui/react-direction'
import { useTranslation } from 'react-i18next'
import { getLanguageDirection } from '@/shared/lib/document-language'
import { Toaster } from '@/shared/components/toaster'
import { handleApiError } from '@/shared/lib/api-error'
import { router } from './router'

/**
 * Front-end application root.
 *
 * It wires TanStack Query, TanStack Router, and the global toaster so all pages share one query
 * cache and one navigation context.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: (failureCount, error) => {
        // Don't retry on 401/403/404
        if (error instanceof Error && /HTTP (401|403|404)/.test(error.message)) {
          return false
        }
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.skipGlobalErrorHandler) {
        return
      }
      handleApiError(error)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.skipGlobalErrorHandler) {
        return
      }
      // Only auto-handle if the mutation doesn't have its own onError
      if (!mutation.options.onError) {
        handleApiError(error)
      }
    },
  }),
})

export function App() {
  const { i18n } = useTranslation()
  const direction = getLanguageDirection(i18n.resolvedLanguage ?? i18n.language)
  return (
    <DirectionProvider dir={direction}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </DirectionProvider>
  )
}
