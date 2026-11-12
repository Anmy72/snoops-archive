
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchImages,
  fetchAlbums,
  fetchTags,
  type PiwigoImage,
  type PiwigoAlbum,
  type PiwigoTag,
} from '../services/api'

function Works() {
  const [images, setImages] = useState<PiwigoImage[]>([])
  const [albums, setAlbums] = useState<PiwigoAlbum[]>([])
  const [tags, setTags] = useState<PiwigoTag[]>([])

  const [search, setSearch] = useState('')
  const [year, setYear] = useState('all')
  const [album, setAlbum] = useState('all')
  const [tag, setTag] = useState('all')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Retrieve images, albums and tags from Piwigo.
  useEffect(() => {
    let active = true

    async function loadArchive() {
      setLoading(true)
      setError(null)

      try {
        const [imageData, albumData, tagData] = await Promise.all([
          fetchImages(),
          fetchAlbums(),
          fetchTags(),
        ])

        if (active) {
          setImages(imageData.images)
          setAlbums(albumData)
          setTags(tagData)
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load the archive.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadArchive()

    return () => {
      active = false
    }
  }, [reloadKey])

  // Get the year from the original creation date,
  // falling back to the date the image entered Piwigo.
  const years = useMemo(() => {
    return [...new Set(
      images
        .map((image) => {
          const date = image.date_creation || image.date_available
          return date?.slice(0, 4)
        })
        .filter((value): value is string => Boolean(value))
    )].sort((a, b) => b.localeCompare(a))
  }, [images])

  // Only show albums containing images directly.
  const availableAlbums = useMemo(() => {
    return albums.filter((item) => item.nb_images > 0)
  }, [albums])

  // Only show tags currently assigned to at least one image.
  const availableTags = useMemo(() => {
    return tags.filter((item) => (item.counter ?? 0) > 0)
  }, [tags])

  // Search and filter the collection.
  const filteredImages = useMemo(() => {
    const query = search.toLowerCase().trim()

    return images.filter((image) => {
      const matchesSearch =
        image.name.toLowerCase().includes(query) ||
        image.file.toLowerCase().includes(query) ||
        String(image.id).includes(query) ||
        (image.comment || '').toLowerCase().includes(query) ||
        image.tags.some((item) =>
          item.name.toLowerCase().includes(query)
        )

      const imageDate = image.date_creation || image.date_available

      const matchesYear =
        year === 'all' || imageDate?.startsWith(year)

      const matchesAlbum =
        album === 'all' ||
        image.categories.some(
          (category) => category.id === Number(album)
        )

      const matchesTag =
        tag === 'all' ||
        image.tags.some(
          (item) => item.id === Number(tag)
        )

      return matchesSearch && matchesYear && matchesAlbum && matchesTag
    })
  }, [images, search, year, album, tag])

  // Find the album name associated with an image.
  const getAlbumName = (image: PiwigoImage) => {
    const category = image.categories[0]

    if (!category) return 'Uncategorised'

    const matchingAlbum = albums.find(
      (item) => item.id === category.id
    )

    return matchingAlbum?.name || `Album ${category.id}`
  }

  // Clear all filters.
  const clearFilters = () => {
    setSearch('')
    setYear('all')
    setAlbum('all')
    setTag('all')
  }

  return (
    <section className="archive-page">
      {/* PAGE INTRODUCTION */}
      <div className="page-title">
        <span className="eyebrow">01 / THE COLLECTION</span>

        <h1>
          Works<span className="period">.</span>
        </h1>

        <p>
          A collection of graphic experiments, visual studies
          and finished pieces.
        </p>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="archive-controls">
        <input
          type="search"
          placeholder="Search by title, filename, ID or tag..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search artworks"
        />

        <select
          value={year}
          onChange={(event) => setYear(event.target.value)}
          aria-label="Filter by year"
        >
          <option value="all">All years</option>

          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={album}
          onChange={(event) => setAlbum(event.target.value)}
          aria-label="Filter by album"
        >
          <option value="all">All albums</option>

          {availableAlbums.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          value={tag}
          onChange={(event) => setTag(event.target.value)}
          aria-label="Filter by tag"
        >
          <option value="all">All tags</option>

          {availableTags.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.counter})
            </option>
          ))}
        </select>
      </div>

      {/* COLLECTION COUNT */}
      <div className="archive-result-count">
        {loading
          ? 'Retrieving collection...'
          : `${filteredImages.length} ${
              filteredImages.length === 1 ? 'work' : 'works'
            }`}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="archive-feedback" aria-live="polite">
          <span className="eyebrow">CONNECTING TO THE ARCHIVE</span>
          <p>Retrieving collected works...</p>
        </div>
      )}

      {/* ERROR */}
      {!loading && error && (
        <div className="archive-feedback archive-error">
          <span className="eyebrow">CONNECTION ERROR</span>
          <p>{error}</p>

          <button
            onClick={() => setReloadKey((current) => current + 1)}
          >
            Try again ↗
          </button>
        </div>
      )}

      {/* IMAGE COLLECTION */}
      {!loading && !error && filteredImages.length > 0 && (
        <div className="works-grid">
          {filteredImages.map((image, index) => (
            <div
              className="work-card"
              key={image.id}
              style={{
                animationDelay: `${-(index % 3) * 2}s`,
              }}
            >
              <Link
                to={`/works/${image.id}`}
                className="work-card-link"
                aria-label={`Open ${image.name || image.file}`}
              >
                <div className="artwork-image">
                  <img
                    src={image.thumbnail_url}
                    alt={image.name || image.file}
                    loading="lazy"
                  />
                </div>

                <div className="work-info">
                  <span>{image.name || image.file}</span>
                  <span>{getAlbumName(image)}</span>
                </div>
              </Link>

              {image.tags.length > 0 && (
                <div className="work-tags">
                  {image.tags.map((item) => (
                    <button
                      className="work-tag"
                      key={item.id}
                      onClick={() => setTag(String(item.id))}
                      title={`Show works tagged ${item.name}`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* NO RESULTS */}
      {!loading && !error && filteredImages.length === 0 && (
        <div className="empty-state">
          <h2>Nothing found.</h2>

          <p>
            {images.length === 0
              ? 'The archive is waiting for something to be added.'
              : 'Try another search or remove some filters.'}
          </p>

          {images.length > 0 && (
            <button onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export default Works
