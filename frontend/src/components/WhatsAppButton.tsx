import { MessageCircle } from 'lucide-react'

const WHATSAPP_NUMBER = '923000000000'

export default function WhatsAppButton({ message }: { message?: string }) {
  const text = message ?? "Hello SULTANÉ, I'd like to ask about a piece."
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-maroon text-cream shadow-lg hover:bg-maroon-dark transition-colors"
      aria-label="Chat with SULTANÉ on WhatsApp"
    >
      <MessageCircle size={24} strokeWidth={1.75} />
    </a>
  )
}
