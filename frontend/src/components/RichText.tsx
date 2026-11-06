// Renders owner-entered plain text (policies, story) as paragraphs.
// Plain text only — never HTML — so nothing entered in the dashboard can inject markup.
export default function RichText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  return (
    <div className={`space-y-5 leading-relaxed ${className}`}>
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        const bullets = lines.filter((l) => /^[•\-*]\s/.test(l.trim()))
        if (bullets.length && bullets.length === lines.length - 1 && !/^[•\-*]\s/.test(lines[0])) {
          return (
            <div key={i}>
              <p className="font-medium text-ink">{lines[0]}</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {bullets.map((b, j) => <li key={j}>{b.replace(/^[•\-*]\s/, '')}</li>)}
              </ul>
            </div>
          )
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {block}
          </p>
        )
      })}
    </div>
  )
}
