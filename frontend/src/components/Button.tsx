import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

type Variant = 'primary' | 'outline' | 'ghost'

const base =
  'inline-flex items-center justify-center gap-2 text-xs tracking-[0.08em] uppercase font-medium px-6 py-3.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary: 'bg-maroon text-cream hover:bg-maroon-dark',
  outline: 'border border-maroon text-maroon hover:bg-maroon hover:text-cream',
  ghost: 'text-maroon hover:opacity-70 px-0 py-0',
}

interface CommonProps {
  variant?: Variant
  icon?: boolean
  children: ReactNode
  className?: string
}

export function Button({
  variant = 'primary',
  icon = true,
  children,
  className = '',
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
      {icon && <ArrowUpRight size={14} strokeWidth={2} />}
    </button>
  )
}

export function LinkButton({
  variant = 'primary',
  icon = true,
  children,
  className = '',
  to,
  ...rest
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return (
    <Link to={to} className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
      {icon && <ArrowUpRight size={14} strokeWidth={2} />}
    </Link>
  )
}
