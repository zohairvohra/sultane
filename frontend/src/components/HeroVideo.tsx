import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX, Pause, Play } from 'lucide-react'
import { LinkButton } from './Button'
import Wordmark from './Wordmark'
import { assetUrl } from '../lib/api'

// Full-width cinematic hero using the owner's own 7-second video:
// muted autoplay, seamless loop, optional sound, premium fallback.
// The video never blocks the page — it streams in behind the overlay.
export default function HeroVideo({ videoUrl, posterUrl }: { videoUrl: string; posterUrl: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const [paused, setPaused] = useState(false)
  const [failed, setFailed] = useState(!videoUrl)
  const [ready, setReady] = useState(false)

  const src = assetUrl(videoUrl)
  const poster = assetUrl(posterUrl)

  useEffect(() => {
    setFailed(!videoUrl)
    setReady(false)
  }, [videoUrl])

  useEffect(() => {
    // Respect reduced-motion preferences: show the first frame, don't autoplay.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      ref.current?.pause()
      setPaused(true)
    }
  }, [])

  const toggleSound = () => {
    const v = ref.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
    if (!v.muted && v.paused) v.play().catch(() => undefined)
  }

  const togglePlay = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) v.play().then(() => setPaused(false)).catch(() => undefined)
    else {
      v.pause()
      setPaused(true)
    }
  }

  return (
    <section className="relative h-[78svh] min-h-[480px] max-h-[900px] w-full overflow-hidden bg-noir" aria-label="SULTANÉ">
      {/* Fallback: owner's poster image, or a rose-gold-on-black brand field */}
      <div className="absolute inset-0">
        {poster ? (
          <img src={poster} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_30%_20%,#3a2a2d_0%,#141213_55%,#000_100%)]" />
        )}
      </div>

      {!failed && (
        <video
          ref={ref}
          className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${ready ? 'opacity-100' : 'opacity-0'}`}
          src={src}
          poster={poster || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={() => setReady(true)}
          onError={() => setFailed(true)}
          aria-hidden="true"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-noir/75 via-noir/15 to-noir/30" />

      <div className="relative h-full flex flex-col items-center justify-end text-center px-6 pb-16 sm:pb-24">
        <div className="eyebrow text-rose-light mb-5">Luxury silver jewellery · Made to order</div>
        <h1 className="sr-only">SULTANÉ — luxury silver jewellery</h1>
        <Wordmark tone="rose" className="text-5xl sm:text-7xl lg:text-8xl drop-shadow-[0_2px_20px_rgba(0,0,0,0.35)]" />
        <p className="text-silver-light/90 max-w-md mt-5 text-sm sm:text-base leading-relaxed">
          Regal traditions of Italy, Türkiye and the Middle East — reimagined in silver, made for you.
        </p>
        <LinkButton to="/shop" variant="rose" className="mt-8 !px-10">
          Shop Now
        </LinkButton>
      </div>

      {!failed && (
        <div className="absolute bottom-5 right-5 sm:bottom-6 sm:right-24 flex gap-2 no-print">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full border border-cream/40 text-cream flex items-center justify-center hover:bg-cream/15 transition-colors"
            aria-label={paused ? 'Play video' : 'Pause video'}
          >
            {paused ? <Play size={15} /> : <Pause size={15} />}
          </button>
          <button
            onClick={toggleSound}
            className="w-10 h-10 rounded-full border border-cream/40 text-cream flex items-center justify-center hover:bg-cream/15 transition-colors"
            aria-label={muted ? 'Turn sound on' : 'Mute video'}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      )}
    </section>
  )
}
