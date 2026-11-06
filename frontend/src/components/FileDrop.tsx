import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'

const MAX_SIZE_MB = 8

interface Props {
  files: File[]
  onChange: (files: File[]) => void
  maxFiles?: number
  title?: string
  accept?: 'images' | 'images+pdf'
}

export default function FileDrop({ files, onChange, maxFiles = 5, title = 'Add reference images', accept = 'images' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const pattern = accept === 'images' ? /\.(jpe?g|png|webp)$/i : /\.(jpe?g|png|webp|pdf)$/i
  const label = accept === 'images' ? 'JPG, PNG or WebP' : 'JPG, PNG, WebP or PDF'

  const previews = useMemo(() => files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)), [files])
  useEffect(() => () => previews.forEach((p) => p && URL.revokeObjectURL(p)), [previews])

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const valid: File[] = []
    let msg = ''
    for (const f of Array.from(incoming)) {
      if (!pattern.test(f.name)) {
        msg = `${f.name} is not a ${label} file.`
        continue
      }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        msg = `${f.name} is larger than ${MAX_SIZE_MB} MB.`
        continue
      }
      valid.push(f)
    }
    const combined = [...files, ...valid]
    if (combined.length > maxFiles) msg = `You can add up to ${maxFiles} file${maxFiles > 1 ? 's' : ''}.`
    onChange(combined.slice(0, maxFiles))
    setError(msg)
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
        className={`border border-dashed text-center py-10 px-6 transition-colors ${dragOver ? 'border-rose bg-blush-light' : 'border-silver bg-cream-dark/60'}`}
      >
        <Upload size={22} strokeWidth={1.3} className="text-rose mx-auto mb-3" />
        <p className="font-display text-xl text-noir mb-1">{title}</p>
        <p className="text-xs text-stone mb-5">
          {label}, up to {MAX_SIZE_MB} MB each{maxFiles > 1 ? `, maximum ${maxFiles} files` : ''}.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="border border-noir text-noir text-[11px] uppercase tracking-[0.16em] px-5 py-3 hover:bg-noir hover:text-cream transition-colors"
        >
          Choose file{maxFiles > 1 ? 's' : ''}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={accept === 'images' ? '.jpg,.jpeg,.png,.webp,image/*' : '.jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf'}
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {error && <p className="text-xs text-danger mt-2">{error}</p>}

      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="relative border border-line bg-cream aspect-square">
              {previews[i] ? (
                <img src={previews[i]!} alt={f.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-stone p-2 text-center break-all">{f.name}</div>
              )}
              <button
                type="button"
                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${f.name}`}
                className="absolute top-1 right-1 w-6 h-6 bg-noir/80 text-cream flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
