import { useEffect, useState } from 'react'
import { getCollections } from './api'
import type { Collection } from '../data/types'

// Collections change rarely; share one request across the header, footer and pages.
let cache: Promise<Collection[]> | null = null

export function loadCollections(force = false) {
  if (!cache || force) cache = getCollections().catch(() => {
    cache = null
    return []
  })
  return cache
}

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([])
  useEffect(() => {
    let alive = true
    loadCollections().then((c) => alive && setCollections(c))
    return () => {
      alive = false
    }
  }, [])
  return collections
}
