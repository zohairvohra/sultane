export const formatPKR = (amount: number) => `Rs. ${Math.round(amount).toLocaleString('en-PK')}`

export const formatDate = (iso: string | null | undefined, withTime = false) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return withTime
    ? d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const MAJOR_CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta',
  'Hyderabad', 'Sialkot', 'Gujranwala', 'Abbottabad', 'Bahawalpur', 'Sukkur',
]

export const PROVINCES = ['Sindh', 'Punjab', 'Islamabad Capital Territory', 'Khyber Pakhtunkhwa', 'Balochistan', 'Gilgit-Baltistan', 'Azad Jammu & Kashmir']

export const isKarachi = (city: string) => city.trim().toLowerCase() === 'karachi'
