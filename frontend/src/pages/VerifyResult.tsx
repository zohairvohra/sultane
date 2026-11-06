import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileCheck2, FileX2 } from 'lucide-react'
import { lookupArticle, type ArticleLookupResult } from '../lib/api'
import ProductImage from '../components/ProductImage'
import { LinkButton } from '../components/Button'
import type { CollectionSlug } from '../data/types'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export default function VerifyResult() {
  const [params] = useSearchParams()
  const code = params.get('code') ?? ''
  const [record, setRecord] = useState<ArticleLookupResult | null | undefined>(undefined)

  useEffect(() => {
    setRecord(undefined)
    if (!code) {
      setRecord(null)
      return
    }
    lookupArticle(code).then(setRecord).catch(() => setRecord(null))
  }, [code])

  if (record === undefined) {
    return <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-24 text-center text-stone">Checking the registry…</div>
  }

  if (!record) {
    return (
      <div className="bg-blush">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-20">
          <FileX2 size={28} strokeWidth={1.5} className="text-maroon mb-5" />
          <div className="text-[11px] uppercase tracking-[0.12em] text-maroon/70 mb-4">Article registry / No match</div>
          <h1 className="font-display text-5xl text-maroon mb-5">We couldn&rsquo;t find that code.</h1>
          <p className="text-stone max-w-xl leading-relaxed mb-2">
            <span className="font-mono">{code || '(no code entered)'}</span> does not match a record in SULTANÉ&rsquo;s
            registry.
          </p>
          <p className="text-stone max-w-xl leading-relaxed mb-8">
            Check for missing characters, spaces or typing errors. A missing record does not by itself mean an item
            is inauthentic — contact support with the code and article details for a closer review.
          </p>
          <div className="flex flex-wrap gap-4">
            <LinkButton to="/verify" variant="outline" className="w-fit">Try another code</LinkButton>
            <LinkButton to="/care" variant="outline" className="w-fit">Contact support</LinkButton>
          </div>
        </div>
      </div>
    )
  }

  const collectionSlug = record.collectionSlug as CollectionSlug

  return (
    <div>
      <div className="bg-blush">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-20">
          <FileCheck2 size={28} strokeWidth={1.5} className="text-maroon mb-5" />
          <div className="text-[11px] uppercase tracking-[0.12em] text-maroon/70 mb-4">Article registry / Match found</div>
          <h1 className="font-display text-5xl sm:text-6xl text-maroon mb-5">This code matches our records</h1>
          <p className="font-mono text-ink mb-4">{record.code}</p>
          <p className="text-stone max-w-xl leading-relaxed">
            A lookup confirms that a code exists in SULTANÉ&rsquo;s registry. It does not independently prove an item
            is genuine.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-16 grid lg:grid-cols-2 gap-14">
        <ProductImage category="Rings" collection={collectionSlug} className="aspect-square w-full" iconClassName="w-24 h-24" />

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] uppercase tracking-[0.1em] text-stone">Article record</div>
            <span className="bg-cream-dark text-xs px-3 py-1">Registry match</span>
          </div>
          <h2 className="font-display text-5xl text-maroon mb-2">{record.productName}</h2>
          <p className="text-stone mb-6">{record.collectionSlug} · {record.sku}{record.variant ? ` · ${record.variant}` : ''}</p>

          <dl className="space-y-4 border-t border-line pt-6">
            <Row label="Registered to" value={record.customerName} />
            <Row label="Purchase date" value={formatDate(record.purchaseDate)} />
            <Row label="Material / fineness" value={record.materialNote ?? 'Pending confirmation'} />
            <Row label="Recorded weight" value={record.recordedWeight ?? 'Pending confirmation'} />
            <Row label="First verified" value={formatDate(record.firstVerified)} />
            <Row label="Verification count" value={`${record.verificationCount} · includes this lookup`} />
          </dl>

          <div className="bg-cream-dark p-5 mt-8">
            <div className="text-sm font-medium text-ink mb-1">Copied codes are possible</div>
            <p className="text-xs text-stone leading-relaxed">
              A match is not independent proof that the physical item is genuine. Compare the piece with the recorded
              details. If anything differs, contact support and include this code.
            </p>
          </div>

          <p className="text-xs text-stone mt-6">
            For the buyer&rsquo;s privacy, phone numbers, delivery addresses and other contact details are never shown
            on this page.
          </p>

          <div className="mt-8">
            <LinkButton to="/verify" variant="outline" className="w-fit">Look up another code</LinkButton>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid sm:grid-cols-[160px_1fr] gap-1 sm:gap-6">
      <dt className="text-xs uppercase tracking-wide text-stone">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  )
}
