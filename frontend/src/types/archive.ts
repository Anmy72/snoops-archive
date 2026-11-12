export interface Artwork {
  id: string
  slug: string
  title: string
  description: string
  concept?: string

  date: string
  year: number
  medium: string
  tags: string[]

  image: string
  thumbnail?: string

  projectIds: string[]

  references?: Reference[]
  process?: ProcessMaterial[]
}

export interface Project {
  id: string
  slug: string
  title: string
  description: string
  year: number

  coverImage: string
  artworkIds: string[]

  status?: 'ongoing' | 'completed' | 'archived'
}

export interface StreetEntry {
  id: string
  title?: string
  description?: string

  image: string
  location: string
  city: string
  date: string

  tags: string[]
  relatedProjectIds?: string[]
}

export interface Reference {
  id: string
  title: string
  creator?: string
  sourceUrl?: string
  image?: string
  description?: string
}

export interface ProcessMaterial {
  id: string
  title: string
  type: 'source' | 'development' | 'separation' | 'iteration'
  image: string
  description?: string
  channel?: 'cyan' | 'magenta' | 'yellow' | 'black'
}
