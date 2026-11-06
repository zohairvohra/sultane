import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ShieldCheck, ShieldX, ScanLine } from 'lucide-react'
import { Button } from '../components/Button'
import Wordmark from '../components/Wordmark'
import { verifyArticle, ApiError, type VerificationResult } from '../lib/api'
import { formatDate } from '../lib/format'

// /verify        → enter an article number
// /verify/:code  → result (this is where the QR code on the authenticity card points)
export default function Verify() {
  const { code: routeCode } = useParams()
  const navigate = useNavigate()
  const [input, setInput] = useState(routeCode ?? '')
  const [state, setState] = useState<'idle' | 'loading' | 'found' | 'not-found' | 'error'>('idle')
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!routeCode) {
      setState('idle')
      return
    }
    setInput(routeCode)
    setState('loading')
    verifyArticle(routeCode)
      .then((r) => {
        setResult(r)
        setState(r ? 'found' : 'not-found')
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Verification is unavailable right now.')
        setState('error')
      })
  }, [routeCode])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = input.trim().toUpperCase()
    if (clean) navigate(`/verify/${encodeURIComponent(clean)}`)
  }

  return (
    <div className="bg-noir min-h-[75vh] text-cream">
      <div className="mx-auto max-w-2xl px-6 py-16 sm:py-24 text-center">
        <ShieldCheck size={36} strokeWidth={1} className="text-rose-light mx-auto mb-5" />
        <div className="eyebrow text-rose-light mb-3">Article-number registry</div>
        <h1 className="font-display text-4xl sm:text-6xl mb-5">Verify Your Piece</h1>
        <p className="text-silver-light leading-relaxed mb-10">
          Every SULTANÉ piece receives its own article number once its purchase is confirmed. Enter the number from your authenticity card,
          or scan its QR code.
        </p>

        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
          <label htmlFor="code" className="sr-only">Article number</label>
          <input
            id="code"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="SLT-XXXX-XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 bg-transparent border border-silver/40 px-4 py-3.5 font-mono tracking-[0.12em] text-center sm:text-left focus:outline-none focus:border-rose-light"
          />
          <Button type="submit" variant="rose" disabled={state === 'loading'}>
            {state === 'loading' ? 'Checking…' : 'Verify'}
          </Button>
        </form>
        <p className="text-xs text-silver/60 mt-4 flex items-center justify-center gap-2">
          <ScanLine size={14} /> Scanning the QR code on your card opens this page automatically.
        </p>

        {state === 'found' && result && (
          <div className="mt-12 bg-cream text-noir p-8 sm:p-10 text-left relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-rosegold" />
            <div className="flex items-center justify-between mb-6">
              <Wordmark className="text-xl" />
              <span className="inline-flex items-center gap-1.5 text-success text-xs uppercase tracking-[0.14em]">
                <ShieldCheck size={15} /> Registered
              </span>
            </div>
            <dl className="space-y-4">
              <div>
                <dt className="eyebrow text-stone mb-1">Jewellery piece</dt>
                <dd className="font-display text-3xl">{result.productName}</dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="eyebrow text-stone mb-1">Owner</dt>
                  <dd>{result.customerName}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-stone mb-1">Purchase date</dt>
                  <dd>{formatDate(result.purchaseDate)}</dd>
                </div>
              </div>
              <div>
                <dt className="eyebrow text-stone mb-1">Article number</dt>
                <dd className="font-mono tracking-wider">{result.code}</dd>
              </div>
            </dl>
          </div>
        )}

        {state === 'not-found' && (
          <div className="mt-12 border border-silver/30 p-8">
            <ShieldX size={28} strokeWidth={1.2} className="text-rose-light mx-auto mb-3" />
            <div className="font-display text-2xl mb-2">Not found in our registry</div>
            <p className="text-sm text-silver-light">
              Please check the number on your card and try again. If you believe this is a mistake,{' '}
              <Link to="/contact" className="underline">contact us</Link>.
            </p>
          </div>
        )}

        {state === 'error' && <p className="mt-10 text-sm text-rose-light">{error}</p>}
      </div>
    </div>
  )
}
