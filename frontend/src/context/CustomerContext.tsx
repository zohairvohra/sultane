import { createContext, useContext, useState, type ReactNode } from 'react'
import { customerLogin, customerRegister, type CustomerSession } from '../lib/api'

interface CustomerContextValue {
  token: string | null
  customer: CustomerSession['customer'] | null
  login: (phone: string, password: string) => Promise<void>
  register: (b: { name: string; phone: string; email?: string; password: string }) => Promise<void>
  logout: () => void
}

const STORAGE_KEY = 'sultane_customer_session'
const CustomerContext = createContext<CustomerContextValue | null>(null)

function readStored(): CustomerSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CustomerSession) : null
  } catch {
    return null
  }
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CustomerSession | null>(readStored)

  const save = (s: CustomerSession | null) => {
    try {
      if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    setSession(s)
  }

  return (
    <CustomerContext.Provider
      value={{
        token: session?.token ?? null,
        customer: session?.customer ?? null,
        login: async (phone, password) => save(await customerLogin(phone, password)),
        register: async (b) => save(await customerRegister(b)),
        logout: () => save(null),
      }}
    >
      {children}
    </CustomerContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function useCustomer() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomer must be used within CustomerProvider')
  return ctx
}
