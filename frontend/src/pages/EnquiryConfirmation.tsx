import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Check, MessageCircle } from 'lucide-react'
import { ExternalButton, LinkButton } from '../components/Button'
import { useSettings } from '../context/SettingsContext'
import { waLink } from '../lib/whatsapp'

interface State {
  ref: string
  name: string
  type: 'customize' | 'new-design'
  productName?: string
  jewelleryType?: string
  description: string
}

export default function EnquiryConfirmation() {
  const { state } = useLocation() as { state: State | null }
  const { settings } = useSettings()

  const message = state
    ? state.type === 'customize'
      ? `Hello SULTANÉ, I've sent a customisation request (${state.ref}) for the ${state.productName}.\n\n${state.description}`
      : `Hello SULTANÉ, I've submitted a custom design request (${state.ref})${state.jewelleryType ? ` for a ${state.jewelleryType.toLowerCase().replace(/s$/, '')}` : ''}.\n\n${state.description}`
    : ''
  const href = waLink(settings.whatsapp_number, message.slice(0, 1200))

  // Hand the customer straight to WhatsApp to continue the conversation.
  useEffect(() => {
    if (!state) return
    const t = setTimeout(() => window.open(href, '_blank', 'noopener'), 900)
    return () => clearTimeout(t)
  }, [state, href])

  if (!state) return <Navigate to="/custom-jewellery" replace />

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 text-center">
      <div className="w-14 h-14 rounded-full bg-blush mx-auto flex items-center justify-center mb-6">
        <Check size={24} strokeWidth={1.5} className="text-rose-dark" />
      </div>
      <div className="eyebrow text-rose-dark mb-3">Request received · {state.ref}</div>
      <h1 className="font-display text-4xl sm:text-5xl text-noir mb-5">Thank you, {state.name.split(' ')[0]}.</h1>
      <p className="text-stone leading-relaxed mb-8">
        We're opening WhatsApp so you can continue the conversation with us — we'll confirm what's possible, the price and the
        production time there. This is a request, not an order: nothing has been charged.
      </p>
      <ExternalButton href={href} variant="primary" className="mb-4">
        <MessageCircle size={15} /> Continue on WhatsApp
      </ExternalButton>
      <div>
        <LinkButton to="/shop" variant="ghost" icon={false} className="mt-4">Continue browsing</LinkButton>
      </div>
    </div>
  )
}
