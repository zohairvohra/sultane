import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, MessageCircle, ShieldCheck, Truck, AlertTriangle } from 'lucide-react'
import type { CustomerOrder } from '../data/types'
import { ORDER_FLOW, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../data/types'
import { formatDate, formatPKR } from '../lib/format'
import { uploadPaymentProof, ApiError } from '../lib/api'
import { useSettings } from '../context/SettingsContext'
import { waLink } from '../lib/whatsapp'
import FileDrop from './FileDrop'
import { Button, ExternalButton } from './Button'

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-line last:border-0">
      <span className="text-stone text-sm">{label}</span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
        }}
        className="flex items-center gap-2 text-sm font-medium text-right break-all"
      >
        {value} {copied ? <Check size={13} className="text-success shrink-0" /> : <Copy size={13} className="text-stone shrink-0" />}
      </button>
    </div>
  )
}

function Timeline({ order }: { order: CustomerOrder }) {
  if (order.orderStatus === 'cancelled') return <div className="bg-danger-bg text-danger text-sm p-4">This order has been cancelled.</div>
  if (order.orderStatus === 'pending-price') {
    return <div className="bg-warn-bg text-warn text-sm p-4">We are finalising the price for your custom piece. We'll confirm on WhatsApp.</div>
  }
  const current = ORDER_FLOW.indexOf(order.orderStatus)
  return (
    <ol className="grid grid-cols-1 sm:grid-cols-7 gap-0 sm:gap-2">
      {ORDER_FLOW.map((s, i) => {
        const done = i < current
        const now = i === current
        return (
          <li key={s} className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 py-2 sm:py-0">
            <div className={`h-0.5 w-full hidden sm:block ${done || now ? 'bg-rose' : 'bg-line'}`} />
            <span
              className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] sm:hidden ${
                done ? 'bg-rose text-cream' : now ? 'border-2 border-rose text-rose-dark' : 'border border-line text-stone'
              }`}
            >
              {done ? <Check size={12} /> : i + 1}
            </span>
            <span className={`text-xs leading-tight ${now ? 'text-noir font-medium' : done ? 'text-ink' : 'text-stone'}`}>{ORDER_STATUS_LABELS[s]}</span>
          </li>
        )
      })}
    </ol>
  )
}

interface Props {
  order: CustomerOrder
  phone?: string // known when the customer proved ownership (checkout / lookup)
  onChange?: (o: CustomerOrder) => void
}

export default function OrderView({ order, phone, onChange }: Props) {
  const { settings } = useSettings()
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploaded, setUploaded] = useState(false)

  const awaitingPayment = order.orderStatus === 'awaiting-payment' && order.paymentStatus !== 'verified'
  const wa = (text: string) => waLink(settings.whatsapp_number, text)

  const upload = async () => {
    if (!files[0] || !phone) return
    setUploading(true)
    setUploadError('')
    try {
      const updated = await uploadPaymentProof(order.ref, phone, files[0])
      setFiles([])
      setUploaded(true)
      onChange?.(updated)
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed. Please try again or send it on WhatsApp.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-10 lg:gap-14">
      <div className="space-y-10">
        <section>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="bg-noir text-cream text-[11px] uppercase tracking-[0.14em] px-3 py-1.5">{ORDER_STATUS_LABELS[order.orderStatus]}</span>
            <span
              className={`text-[11px] uppercase tracking-[0.14em] px-3 py-1.5 ${
                order.paymentStatus === 'verified' ? 'bg-success-bg text-success' : order.paymentStatus === 'flagged' ? 'bg-danger-bg text-danger' : 'bg-warn-bg text-warn'
              }`}
            >
              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </span>
          </div>
          <Timeline order={order} />
        </section>

        {awaitingPayment && order.bankDetails && (
          <section className="border border-rose p-6 sm:p-8">
            <div className="eyebrow text-rose-dark mb-2">Step 1 · Transfer your payment</div>
            <h2 className="font-display text-3xl mb-2">Pay {formatPKR(order.total)} by bank transfer</h2>
            <p className="text-sm text-stone mb-5">Please use your order number <strong className="text-ink">{order.ref}</strong> as the payment reference.</p>
            <div className="bg-cream-dark px-5 py-2 mb-6">
              <CopyRow label="Bank" value={order.bankDetails.bankName} />
              <CopyRow label="Account title" value={order.bankDetails.accountTitle} />
              <CopyRow label="Account number" value={order.bankDetails.accountNumber} />
              <CopyRow label="IBAN" value={order.bankDetails.iban} />
              <CopyRow label="Amount" value={String(order.total)} />
              <CopyRow label="Reference" value={order.ref} />
            </div>

            <div className="eyebrow text-rose-dark mb-2">Step 2 · Send us your receipt</div>
            {order.paymentStatus === 'flagged' && (
              <div className="flex gap-2 bg-danger-bg text-danger text-sm p-4 mb-4">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>We couldn't confirm your payment{order.paymentNote ? `: ${order.paymentNote}` : '.'} Please upload a clearer receipt or message us.</span>
              </div>
            )}
            {order.paymentStatus === 'proof-submitted' && (
              <p className="text-sm text-success mb-4">
                {uploaded ? 'Thank you — receipt uploaded.' : 'We have your receipt.'} Our team will verify it manually; production starts after
                verification. You can replace it below if needed.
              </p>
            )}
            {phone ? (
              <>
                <FileDrop files={files} onChange={setFiles} maxFiles={1} title="Upload payment receipt" accept="images+pdf" />
                {uploadError && <p className="text-sm text-danger mt-2">{uploadError}</p>}
                <div className="flex flex-wrap gap-3 mt-4">
                  <Button type="button" onClick={upload} disabled={!files.length || uploading}>
                    {uploading ? 'Uploading…' : 'Upload receipt'}
                  </Button>
                  <ExternalButton href={wa(`Hello SULTANÉ, here is my payment receipt for order ${order.ref} (${formatPKR(order.total)}).`)} variant="outline">
                    <MessageCircle size={14} /> Send on WhatsApp instead
                  </ExternalButton>
                </div>
              </>
            ) : (
              <p className="text-sm text-stone">
                To upload a receipt, open this order from <Link to="/track-order" className="underline">Track your order</Link> with your phone number,
                or <a href={wa(`Hello SULTANÉ, here is my payment receipt for order ${order.ref}.`)} target="_blank" rel="noopener noreferrer" className="underline">send it on WhatsApp</a>.
              </p>
            )}
          </section>
        )}

        {order.articles.length > 0 && (
          <section className="bg-noir text-cream p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={18} strokeWidth={1.3} className="text-rose-light" />
              <span className="eyebrow text-rose-light">Your article numbers</span>
            </div>
            <p className="text-sm text-silver-light mb-5">
              Each piece is registered with its own number, printed on your SULTANÉ authenticity card. Anyone can confirm it on{' '}
              <Link to="/verify" className="underline">Verify Your Piece</Link>.
            </p>
            <ul className="divide-y divide-silver/20">
              {order.articles.map((a) => (
                <li key={a.code} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm">{a.productName}</span>
                  <Link to={`/verify/${a.code}`} className="font-mono tracking-wider text-rose-light hover:underline">{a.code}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {order.courier && (
          <section className="border border-line p-6">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={18} strokeWidth={1.3} className="text-rose" />
              <h2 className="font-display text-2xl">Courier</h2>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-stone">Courier</dt>
              <dd>{order.courier.name}</dd>
              {order.courier.trackingNumber && (
                <>
                  <dt className="text-stone">Tracking number</dt>
                  <dd className="font-mono">{order.courier.trackingNumber}</dd>
                </>
              )}
              {order.courier.dispatchDate && (
                <>
                  <dt className="text-stone">Dispatched</dt>
                  <dd>{formatDate(order.courier.dispatchDate)}</dd>
                </>
              )}
            </dl>
            {order.courier.trackingUrl && (
              <a href={order.courier.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-sm underline underline-offset-2">
                Track with {order.courier.name} ↗
              </a>
            )}
          </section>
        )}

        {order.orderStatus === 'delivered' && (
          <section className="bg-cream-dark p-6 text-sm text-stone">
            <div className="font-medium text-ink mb-1">Something wrong with your order?</div>
            Report a defective or incorrect item on WhatsApp within 24 hours of delivery with your order number, photos or a video, and a short
            description.{' '}
            <a href={wa(`Hello SULTANÉ, I'd like to report a problem with order ${order.ref}.\n\nProblem: `)} target="_blank" rel="noopener noreferrer" className="underline text-noir">
              Report on WhatsApp
            </a>
            {' · '}
            <Link to="/policies/returns" className="underline">Returns &amp; defects policy</Link>
          </section>
        )}
      </div>

      <aside className="bg-cream-dark p-6 sm:p-8 h-fit">
        <div className="text-xs text-stone">Order {order.ref} · {formatDate(order.createdAt)}</div>
        <ul className="mt-5 space-y-4 border-b border-line pb-5">
          {order.items.map((i) => (
            <li key={i.id} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-display text-lg leading-tight">{i.name}</span>
                <span>{formatPKR(i.unitPrice * i.qty)}</span>
              </div>
              <div className="text-xs text-stone">
                Qty {i.qty}
                {i.size ? ` · Size ${i.size}` : ''}
                {i.isCustom ? ' · Custom piece' : ''}
                {i.gemstoneTesting ? ` · Gemstone testing (+${formatPKR(i.testingFee * i.qty)})` : ''}
              </div>
              {i.customDetails && <p className="text-xs text-stone mt-1 whitespace-pre-line">{i.customDetails}</p>}
            </li>
          ))}
        </ul>
        <dl className="space-y-2 text-sm py-5 border-b border-line">
          <div className="flex justify-between"><dt className="text-stone">Subtotal</dt><dd>{formatPKR(order.subtotal)}</dd></div>
          {order.testingFees > 0 && <div className="flex justify-between"><dt className="text-stone">Gemstone testing</dt><dd>{formatPKR(order.testingFees)}</dd></div>}
          <div className="flex justify-between"><dt className="text-stone">Delivery</dt><dd>{order.delivery === 0 ? 'Free' : formatPKR(order.delivery)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between text-success"><dt>Discount{order.promoCode ? ` (${order.promoCode})` : ''}</dt><dd>– {formatPKR(order.discount)}</dd></div>}
        </dl>
        <div className="flex justify-between items-baseline pt-5">
          <span className="font-display text-2xl">Total</span>
          <span className="font-display text-2xl">{formatPKR(order.total)}</span>
        </div>
        <div className="text-xs text-stone mt-6 leading-relaxed">
          <div className="text-ink mb-1">Delivering to</div>
          {order.customerName}
          <br />
          {order.address.street}
          {order.address.area ? `, ${order.address.area}` : ''}
          <br />
          {order.address.city}
          {order.address.province ? `, ${order.address.province}` : ''}
        </div>
      </aside>
    </div>
  )
}
