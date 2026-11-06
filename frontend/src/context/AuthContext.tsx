import { createContext, useContext, useState, type ReactNode } from 'react'
import { adminLogin, type AdminSession } from '../lib/api'

interface AuthContextValue {
  token: string | null
  admin: AdminSession['admin'] | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

// sessionStorage: the admin session ends when the browser tab closes.
const STORAGE_KEY = 'sultane_admin_session'
const AuthContext = createContext<AuthContextValue | null>(null)

function readStored(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AdminSession
    // Drop tokens that have already expired.
    const payload = JSON.parse(atob(session.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp * 1000 < Date.now()) return null
    return session
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(readStored)

  const login = async (email: string, password: string) => {
    const result = await adminLogin(email, password)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result))
    } catch {
      /* ignore */
    }
    setSession(result)
  }

  const logout = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setSession(null)
  }

  return <AuthContext.Provider value={{ token: session?.token ?? null, admin: session?.admin ?? null, login, logout }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
