import type { Collection } from './types'

export const collections: Collection[] = [
  {
    slug: 'italia',
    name: 'Italia',
    tagline: 'Fluid lines, sculptural ease.',
    description:
      'Soft, poured silhouettes inspired by Italian sculptural form. A design language, not a claim of manufacturing origin.',
  },
  {
    slug: 'bharat',
    name: 'Bharat',
    tagline: 'Ornament with a lyrical rhythm.',
    description:
      'Intricate filigree and drop forms drawing on South Asian ornament traditions, reimagined for everyday wear.',
  },
  {
    slug: 'turkish',
    name: 'Turkish',
    tagline: 'Intricate motifs, reimagined.',
    description:
      'Medallion and motif work inspired by Turkish decorative arts, rendered in quiet sterling silver.',
  },
  {
    slug: 'middle-eastern',
    name: 'Middle Eastern',
    tagline: 'Bold forms, luminous presence.',
    description:
      'Confident, sculptural silhouettes with a hammered or brushed finish — presence without excess.',
  },
  {
    slug: 'moroccan',
    name: 'Moroccan',
    tagline: 'Geometry in a softer light.',
    description:
      'Lattice and geometric detailing inspired by Moroccan pattern work, softened for daily wear.',
  },
]

export const collectionBySlug = (slug: string) => collections.find((c) => c.slug === slug)
