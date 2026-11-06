import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

type Variant = 'primary' | 'outline' | 'rose' | 'light' | 'ghost'

const base =
  'inline-flex items-center justify-center gap-2 text-[11px] tracking-[0.18em] uppercase font-medium px-7 py-3.5 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary: 'bg-noir text-cream hover:bg-rose-dark',
  outline: 'border border-noir text-noir hover:bg-noir hover:text-cream',
  rose: 'bg-rosegold text-noir hover:brightness-105 shadow-sm',
  light: 'border border-cream/80 text-cream hover:bg-cream hover:text-noir',
  ghost: 'text-noir hover:text-rose-dark px-0 py-0',
}

interface CommonProps {
  variant?: Variant
  icon?: boolean
  children: ReactNode
  className?: string
}

export function Button({ variant = 'primary', icon = false, children, className = '', ...rest }: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
      {icon && <ArrowRight size={14} strokeWidth={1.75} />}
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
      {icon && <ArrowRight size={14} strokeWidth={1.75} />}
    </Link>
  )
}

export function ExternalButton({ variant = 'primary', icon = false, children, className = '', ...rest }: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a target="_blank" rel="noopener noreferrer" className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
      {icon && <ArrowRight size={14} strokeWidth={1.75} />}
    </a>
  )
}
