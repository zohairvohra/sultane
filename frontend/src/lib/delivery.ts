export const CITIES = [
  'Karachi',
  'Lahore, Punjab',
  'Islamabad',
  'Rawalpindi, Punjab',
  'Faisalabad, Punjab',
  'Multan, Punjab',
  'Peshawar',
  'Quetta',
  'Other city in Pakistan',
] as const

export function deliveryFeeFor(city: string): number {
  if (city === 'Karachi') return 0
  if (city === 'Other city in Pakistan') return 450
  return 350
}
