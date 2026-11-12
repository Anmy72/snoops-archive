
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export interface PiwigoCategoryReference {
  id: number
  name?: string
  url?: string
  page_url?: string
}

export interface PiwigoTag {
  id: number
  name: string
  url_name?: string
  counter?: number
  lastmodified?: string
  url?: string
  page_url?: string
}

export interface PiwigoImage {
  id: number
  name: string
  file: string
  comment: string | null
  author?: string | null
  hit?: number
  filesize?: number
  width: number
  height: number
  date_creation: string | null
  date_available: string
  element_url?: string
  download_url?: string
  page_url?: string
  thumbnail_url: string
  image_url: string
  categories: PiwigoCategoryReference[]
  tags: PiwigoTag[]
}

export interface PiwigoImagesResponse {
  images: PiwigoImage[]
  paging: {
    page: number
    per_page: number
    count: number
    total_count: number
  }
}

interface PiwigoImageResponse {
  image: PiwigoImage
}

export interface PiwigoAlbum {
  id: number
  name: string
  nb_images: number
  total_nb_images: number
  id_uppercat: number | null
}

interface PiwigoAlbumsResponse {
  albums: {
    categories: PiwigoAlbum[]
  }
}

interface PiwigoTagsResponse {
  tags: PiwigoTag[]
}

// Curated artwork metadata

export interface ArtworkMetadata {
  artwork_id: number
  year: number | null
  medium: string | null
  physical_dimensions: string | null
  description: string | null
  process_notes: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ArtworkMetadataInput {
  year: number | null
  medium: string | null
  physical_dimensions: string | null
  description: string | null
  process_notes: string | null
}

interface ArtworkMetadataResponse {
  metadata: ArtworkMetadata
}

interface SaveArtworkMetadataResponse {
  message: string
  metadata: ArtworkMetadata
}

// Additional artwork material

export interface SupportingImage {
  id: number
  piwigo_image_id: number
  type: 'source' | 'cmyk'
  channel: 'C' | 'M' | 'Y' | 'K' | null
  label: string | null
  sort_order: number
  name: string
  image_url: string
  thumbnail_url: string
}

export interface ArtworkAdditionals {
  artwork_id: number
  sources: SupportingImage[]
  cmyk: {
    C: SupportingImage | null
    M: SupportingImage | null
    Y: SupportingImage | null
    K: SupportingImage | null
  }
}

export interface SupportingImageInput {
  piwigo_image_id: number
  type: 'source' | 'cmyk'
  channel: 'C' | 'M' | 'Y' | 'K' | null
  label: string | null
  sort_order: number
}

export interface SupportingImageUpdate {
  label: string | null
  sort_order: number
}

interface SupportingImageAssignmentResponse {
  message: string
  relationship_id: number
}

// Image library

export async function fetchImages(
  page = 0,
  perPage = 100
): Promise<PiwigoImagesResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/images?page=${page}&per_page=${perPage}`
  )

  if (!response.ok) {
    throw new Error(`Archive API request failed (${response.status})`)
  }

  return response.json() as Promise<PiwigoImagesResponse>
}

export async function fetchSupportingImages(
  page = 0,
  perPage = 100
): Promise<PiwigoImagesResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/supporting-images?page=${page}&per_page=${perPage}`
  )

  if (!response.ok) {
    throw new Error(
      `Supporting-image library request failed (${response.status})`
    )
  }

  return response.json() as Promise<PiwigoImagesResponse>
}

export async function fetchImage(id: number): Promise<PiwigoImage> {
  const response = await fetch(`${API_BASE_URL}/api/images/${id}`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Artwork not found.')
    }

    throw new Error(`Artwork request failed (${response.status})`)
  }

  const data = await response.json() as PiwigoImageResponse

  return data.image
}

// Artwork metadata

export async function fetchArtworkMetadata(
  artworkId: number
): Promise<ArtworkMetadata> {
  const response = await fetch(
    `${API_BASE_URL}/api/images/${artworkId}/metadata`
  )

  if (!response.ok) {
    throw new Error(
      `Artwork metadata request failed (${response.status})`
    )
  }

  const data = await response.json() as ArtworkMetadataResponse

  return data.metadata
}

export async function saveArtworkMetadata(
  artworkId: number,
  metadata: ArtworkMetadataInput
): Promise<ArtworkMetadata> {
  const response = await fetch(
    `${API_BASE_URL}/api/images/${artworkId}/metadata`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    }
  )

  if (!response.ok) {
    throw new Error(
      `Saving artwork metadata failed (${response.status})`
    )
  }

  const data = await response.json() as SaveArtworkMetadataResponse

  return data.metadata
}

// Artwork supporting materials

export async function fetchArtworkAdditionals(
  artworkId: number
): Promise<ArtworkAdditionals> {
  const response = await fetch(
    `${API_BASE_URL}/api/images/${artworkId}/additionals`
  )

  if (!response.ok) {
    throw new Error(
      `Additional materials request failed (${response.status})`
    )
  }

  return response.json() as Promise<ArtworkAdditionals>
}

export async function addArtworkSupportingImage(
  artworkId: number,
  addition: SupportingImageInput
): Promise<number> {
  const response = await fetch(
    `${API_BASE_URL}/api/images/${artworkId}/additionals`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(addition),
    }
  )

  if (!response.ok) {
    const message = await response.text()
    throw new Error(
      `Assigning supporting image failed (${response.status}): ${message}`
    )
  }

  const data = await response.json() as SupportingImageAssignmentResponse

  return data.relationship_id
}

export async function updateArtworkSupportingImage(
  artworkId: number,
  relationshipId: number,
  update: SupportingImageUpdate
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/images/${artworkId}/additionals/${relationshipId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    }
  )

  if (!response.ok) {
    const message = await response.text()
    throw new Error(
      `Updating supporting image failed (${response.status}): ${message}`
    )
  }
}

export async function deleteArtworkSupportingImage(
  artworkId: number,
  relationshipId: number
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/api/images/${artworkId}/additionals/${relationshipId}`,
    {
      method: 'DELETE',
    }
  )

  if (!response.ok) {
    const message = await response.text()
    throw new Error(
      `Removing supporting image failed (${response.status}): ${message}`
    )
  }
}

// Albums and tags

export async function fetchAlbums(): Promise<PiwigoAlbum[]> {
  const response = await fetch(`${API_BASE_URL}/api/albums`)

  if (!response.ok) {
    throw new Error(`Album API request failed (${response.status})`)
  }

  const data = await response.json() as PiwigoAlbumsResponse

  return data.albums.categories
}

export async function fetchTags(): Promise<PiwigoTag[]> {
  const response = await fetch(`${API_BASE_URL}/api/tags`)

  if (!response.ok) {
    throw new Error(`Tag API request failed (${response.status})`)
  }

  const data = await response.json() as PiwigoTagsResponse

  return data.tags
}
