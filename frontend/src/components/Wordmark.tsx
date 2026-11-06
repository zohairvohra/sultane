export default function Wordmark({ className = '', tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' | 'rose' }) {
  const color = tone === 'rose' ? 'text-rosegold' : tone === 'light' ? 'text-cream' : 'text-noir'
  return <span className={`font-display font-medium tracking-[0.28em] ${color} ${className}`}>SULTANÉ</span>
}
