import { useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'

const MAX_FILES = 5
const MAX_SIZE_MB = 5

export default function FileDrop({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const valid: File[] = []
    for (const f of Array.from(incoming)) {
      if (!/\.(jpe?g|png|webp)$/i.test(f.name)) continue
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`${f.name} is over ${MAX_SIZE_MB} MB and was skipped.`)
        continue
      }
      valid.push(f)
    }
    const combined = [...files, ...valid].slice(0, MAX_FILES)
    onChange(combined)
    if (valid.length && combined.length <= MAX_FILES) setError('')
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        className={`border-2 border-dashed text-center py-12 px-6 transition-colors ${
          dragOver ? 'border-maroon bg-cream-dark' : 'border-sand bg-cream-dark/60'
        }`}
      >
        <Upload size={22} strokeWidth={1.5} className="text-maroon mx-auto mb-3" />
        <p className="font-display text-xl text-maroon mb-2">Drop your inspiration here</p>
        <p className="text-xs text-stone mb-5">
          Choose up to {MAX_FILES} JPG, PNG or WebP files. Maximum {MAX_SIZE_MB} MB per file. Please do not upload
          identity or payment documents.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 border border-maroon text-maroon text-xs uppercase tracking-[0.08em] px-5 py-3 hover:bg-maroon hover:text-cream transition-colors"
        >
          Choose files ↗
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-xs text-maroon mt-2">{error}</p>}

      {files.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-2 mt-4">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between border border-line bg-cream px-4 py-2.5 text-sm">
              <span className="truncate">{f.name} · {(f.size / 1024 / 1024).toFixed(1)} MB</span>
              <button type="button" onClick={() => onChange(files.filter((_, idx) => idx !== i))} aria-label="Remove file">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <p className="text-xs text-stone mt-2">{files.length} of {MAX_FILES} files added</p>
      )}
    </div>
  )
}
