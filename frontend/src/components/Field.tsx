import type { ReactNode } from 'react'

export default function Field({ label, hint, children, className = '' }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs text-stone mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-stone mt-1.5">{hint}</span>}
    </label>
  )
}
