import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, QrCode } from 'lucide-react'
import ProductImage from '../components/ProductImage'

export default function Verify() {
  const [code, setCode] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    navigate(`/verify/result?code=${encodeURIComponent(code.trim())}`)
  }

  return (
    <div>
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-14 sm:py-20 grid lg:grid-cols-2 gap-14">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-stone mb-4">The SULTANÉ article registry</div>
          <h1 className="font-display text-5xl sm:text-6xl text-maroon leading-[1.05] mb-6">
            A little clarity,
            <br />
            in a code.
          </h1>
          <p className="text-stone max-w-md leading-relaxed mb-8">
            A lookup confirms that a code exists in SULTANÉ&rsquo;s registry. It does not independently prove an item
            is genuine.
          </p>
          <ProductImage category="Rings" collection="italia" className="aspect-[4/3] w-full mb-3" iconClassName="w-16 h-16" />
          <p className="text-xs text-stone">
            Illustrative packaging and article imagery. A registry record relates to one physical piece, not a whole
            product style.
          </p>
        </div>

        <div>
          <div className="bg-cream border border-line p-8">
            <div className="flex items-center gap-2 mb-6">
              <ScanLine size={18} strokeWidth={1.5} className="text-maroon" />
              <h2 className="font-display text-2xl text-maroon">Look up an article code.</h2>
            </div>

            <form onSubmit={handleSubmit}>
              <label className="block text-xs text-stone mb-2">Article code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SLT-7K4M-Q9XD-2HRB"
                className="w-full border border-line bg-cream px-4 py-3 text-sm mb-2 focus:outline-none focus:border-maroon font-mono tracking-wide"
              />
              <p className="text-xs text-stone mb-6">
                Use the code printed on the article card or label. Format: SLT-7K4M-Q9XD-2HRB. Include all three
                groups after SLT.
              </p>
              <button
                type="submit"
                className="w-full bg-maroon text-cream text-xs uppercase tracking-[0.08em] font-medium px-6 py-4 hover:bg-maroon-dark transition-colors"
              >
                Look up code ↗
              </button>
            </form>

            <div className="border-t border-line mt-6 pt-6 flex gap-4">
              <div className="w-14 h-14 bg-cream-dark flex items-center justify-center shrink-0">
                <QrCode size={26} strokeWidth={1.25} className="text-maroon" />
              </div>
              <div>
                <div className="text-sm font-medium text-ink mb-1">Prefer to scan?</div>
                <p className="text-xs text-stone leading-relaxed">
                  Use your phone&rsquo;s camera on the article QR. Check that the link opens SULTANÉ&rsquo;s registry,
                  then review the code.
                </p>
              </div>
            </div>

            <div className="bg-cream-dark p-5 mt-6">
              <div className="text-sm font-medium text-ink mb-1">Code not found or entered incorrectly?</div>
              <p className="text-xs text-stone leading-relaxed">
                Check for missing characters, spaces or typing errors and try again. If there is still no match,
                contact support with the code and article details. A missing record does not by itself establish
                authenticity.
              </p>
            </div>

            <p className="text-xs text-stone mt-6">
              No buyer information is requested or displayed. Do not share personal identification or payment
              information.
            </p>
          </div>

          <p className="text-xs text-stone mt-4">
            Try a sample code: <button type="button" onClick={() => setCode('SLT-7K4M-Q9XD-2HRB')} className="underline text-maroon">SLT-7K4M-Q9XD-2HRB</button>
          </p>
        </div>
      </div>

      <div className="bg-cream-dark">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-14 grid sm:grid-cols-2 gap-10">
          <div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-3">What you may see</div>
            <p className="text-sm text-stone leading-relaxed">
              A matching record shows the product, collection, recorded article details and verification history. It
              does not reveal the purchaser.
            </p>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-stone mb-3">What a match cannot do</div>
            <p className="text-sm text-stone leading-relaxed">
              Copied codes are possible. If the article or its details do not align with the record, pause and
              contact support for a closer review.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
