"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { trpc } from "@/lib/trpc"
import superjson from "superjson"
import { SessionProvider } from "next-auth/react"
import { ClientProvider } from "@/lib/client-context"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 5000, refetchOnWindowFocus: false } },
  }))

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
          transformer: superjson,
        }),
      ],
    })
  )

  return (
    <SessionProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ClientProvider>
            {children}
          </ClientProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </SessionProvider>
  )
}
