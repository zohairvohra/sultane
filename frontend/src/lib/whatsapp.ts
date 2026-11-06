export function waLink(number: string | undefined, text: string) {
  const n = (number || '').replace(/\D/g, '')
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}

// Stored phone (923001234567) → readable 0300 1234567
export function displayPhone(p: string) {
  return /^92\d{10}$/.test(p) ? `0${p.slice(2, 5)} ${p.slice(5)}` : p
}
