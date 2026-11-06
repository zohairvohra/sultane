import { useCallback, useState, type ReactNode } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'

export const inputCls = 'w-full border border-line bg-white px-3 py-2 text-sm focus:outline-none focus:border-noir'

export function Panel({ title, children, actions, className = '' }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`bg-cream border border-line ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
          <h2 className="text-[12px] uppercase tracking-[0.14em]">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

const TONES: Record<string, string> = {
  neutral: 'bg-cream-dark text-ink',
  warn: 'bg-warn-bg text-warn',
  good: 'bg-success-bg text-success',
  bad: 'bg-danger-bg text-danger',
  rose: 'bg-blush text-rose-dark',
  dark: 'bg-noir text-cream',
}

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-block text-[10px] uppercase tracking-[0.1em] px-2 py-1 whitespace-nowrap ${TONES[tone]}`}>{children}</span>
}

export function AdminButton({
  children,
  variant = 'primary',
  className = '',
  ...rest
}: { children: ReactNode; variant?: 'primary' | 'outline' | 'danger' | 'ghost' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v = {
    primary: 'bg-noir text-cream hover:bg-rose-dark',
    outline: 'border border-noir text-noir hover:bg-noir hover:text-cream',
    danger: 'border border-danger text-danger hover:bg-danger hover:text-cream',
    ghost: 'text-stone hover:text-noir underline underline-offset-2',
  }[variant]
  return (
    <button className={`text-[11px] uppercase tracking-[0.12em] px-4 py-2.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${v} ${className}`} {...rest}>
      {children}
    </button>
  )
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="block text-xs text-stone mb-1">
      {children}
      {hint && <span className="block text-[11px] text-stone/80 font-normal">{hint}</span>}
    </span>
  )
}

export function Notice({ tone = 'good', children, onClose }: { tone?: 'good' | 'bad' | 'warn'; children: ReactNode; onClose?: () => void }) {
  const t = tone === 'good' ? 'bg-success-bg text-success' : tone === 'bad' ? 'bg-danger-bg text-danger' : 'bg-warn-bg text-warn'
  return (
    <div className={`text-sm px-4 py-3 mb-4 flex justify-between gap-4 ${t}`}>
      <div className="whitespace-pre-line">{children}</div>
      {onClose && <button onClick={onClose} className="shrink-0">×</button>}
    </div>
  )
}

// Runs an admin action with busy/error/success state and signs out on an expired session.
export function useAdminAction() {
  const { logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null)

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string | ((r: T) => string)): Promise<T | undefined> => {
      setBusy(true)
      setMessage(null)
      try {
        const r = await fn()
        if (success) setMessage({ tone: 'good', text: typeof success === 'function' ? success(r) : success })
        return r
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) logout()
        setMessage({ tone: 'bad', text: err instanceof ApiError ? err.message : 'Something went wrong' })
        return undefined
      } finally {
        setBusy(false)
      }
    },
    [logout],
  )

  return { busy, message, setMessage, run }
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'warn' | 'good' }) {
  return (
    <div className="bg-cream border border-line p-5">
      <div className="text-xs text-stone mb-2">{label}</div>
      <div className={`font-display text-3xl ${tone === 'warn' ? 'text-warn' : tone === 'good' ? 'text-success' : ''}`}>{value}</div>
      {sub && <div className="text-xs text-stone mt-1">{sub}</div>}
    </div>
  )
}
