import { useState } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import OrderView from '../components/OrderView'
import type { CustomerOrder } from '../data/types'

// Shown straight after checkout. Holds the order in navigation state;
// a refresh sends the customer to the secure lookup page instead.
export default function OrderConfirmation() {
  const { ref } = useParams()
  const { state } = useLocation() as { state: { order?: CustomerOrder; phone?: string } | null }
  const [order, setOrder] = useState<CustomerOrder | undefined>(state?.order)

  if (!order || order.ref !== ref) return <Navigate to={`/track-order?ref=${encodeURIComponent(ref ?? '')}`} replace />

  return (
    <div>
      <div className="bg-blush-light">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-14 text-center">
          <div className="w-14 h-14 rounded-full bg-cream mx-auto flex items-center justify-center mb-5">
            <Check size={24} strokeWidth={1.5} className="text-rose-dark" />
          </div>
          <div className="eyebrow text-rose-dark mb-3">Order received · {order.ref}</div>
          <h1 className="font-display text-4xl sm:text-5xl text-noir mb-4">Thank you, {order.customerName.split(' ')[0]}.</h1>
          <p className="text-stone max-w-xl mx-auto">
            Your order is submitted and awaiting payment. Transfer the total below and send us your receipt — we'll verify it
            manually and begin making your piece. Keep your order number to track progress.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-12">
        <OrderView order={order} phone={state?.phone} onChange={setOrder} />
      </div>
    </div>
  )
}
