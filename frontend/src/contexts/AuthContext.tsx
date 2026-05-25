import { createContext, useContext, useState, ReactNode } from 'react'

interface AuthCtx {
  apiKey: string
  setApiKey: (k: string) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string>(
    () => localStorage.getItem('api_key') ?? ''
  )

  function setApiKey(k: string) {
    localStorage.setItem('api_key', k)
    setApiKeyState(k)
  }

  return (
    <AuthContext.Provider value={{ apiKey, setApiKey, isAuthenticated: !!apiKey }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
