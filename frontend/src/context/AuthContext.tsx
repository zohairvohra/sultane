import { createContext, useContext, useState, type ReactNode } from 'react'
import { adminLogin, type AdminSession } from '../lib/api'

interface AuthContextValue {
  token: string | null
  admin: AdminSession['admin'] | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const STORAGE_KEY = 'sultane_admin_session'

const AuthContext = createContext<AuthContextValue | null>(null)

function readStored(): AdminSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AdminSession) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(readStored)

  const login = async (email: string, password: string) => {
    const result = await adminLogin(email, password)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
    setSession(result)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ token: session?.token ?? null, admin: session?.admin ?? null, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
