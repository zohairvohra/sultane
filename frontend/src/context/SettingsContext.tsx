import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { getSettings } from '../lib/api'
import type { SiteSettings } from '../data/types'

// Safe defaults so the storefront renders before settings load.
const DEFAULTS: SiteSettings = {
  whatsapp_number: '923000000000',
  delivery_fee_karachi_pkr: 0,
  delivery_fee_other_pkr: 350,
  gemstone_testing_fee_pkr: 799,
  bank_details: { bankName: '', accountTitle: '', accountNumber: '', iban: '' },
  hero_video_url: '',
  hero_poster_url: '',
  loyalty_percent: 5,
  loyalty_valid_days: 90,
  announcement: '',
  about_story: '',
  faqs: [],
  policy_delivery: '',
  policy_returns: '',
  policy_privacy: '',
  policy_terms: '',
}

interface SettingsValue {
  settings: SiteSettings
  loaded: boolean
  refresh: () => void
}

const SettingsContext = createContext<SettingsValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(() => {
    getSettings()
      .then((s) => setSettings({ ...DEFAULTS, ...s }))
      .catch(() => undefined)
      .finally(() => setLoaded(true))
  }, [])

  useEffect(refresh, [refresh])

  return <SettingsContext.Provider value={{ settings, loaded, refresh }}>{children}</SettingsContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
