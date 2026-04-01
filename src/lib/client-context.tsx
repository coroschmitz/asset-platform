"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { trpc } from "@/lib/trpc"

interface ClientInfo {
  id: string
  name: string
  fullName: string
  fmCompany: string | null
  customerKey: string
}

interface ClientContextValue {
  clientId: string | null
  setClientId: (id: string) => void
  client: ClientInfo | null
  clients: ClientInfo[]
  isLoading: boolean
}

const ClientContext = createContext<ClientContextValue>({
  clientId: null,
  setClientId: () => {},
  client: null,
  clients: [],
  isLoading: true,
})

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [clientId, setClientIdState] = useState<string | null>(null)
  const { data: clients, isLoading } = trpc.dashboard.getClients.useQuery()

  const setClientId = useCallback((id: string) => {
    setClientIdState(id)
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedClientId", id)
      const url = new URL(window.location.href)
      url.searchParams.set("clientId", id)
      window.history.replaceState({}, "", url.toString())
    }
  }, [])

  // Initialize from URL param, localStorage, or first client
  useEffect(() => {
    if (!clients?.length) return
    const urlParams = new URLSearchParams(window.location.search)
    const urlClientId = urlParams.get("clientId")
    const storedClientId = localStorage.getItem("selectedClientId")

    const idToUse = urlClientId || storedClientId || clients[0].id
    const validId = clients.find((c) => c.id === idToUse) ? idToUse : clients[0].id
    setClientIdState(validId)
    localStorage.setItem("selectedClientId", validId)
  }, [clients])

  const client = clients?.find((c) => c.id === clientId) ?? null

  return (
    <ClientContext value={{
      clientId,
      setClientId,
      client,
      clients: clients ?? [],
      isLoading,
    }}>
      {children}
    </ClientContext>
  )
}

export function useClientContext() {
  return useContext(ClientContext)
}
