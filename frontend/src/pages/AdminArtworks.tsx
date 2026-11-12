
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { fetchImages } from '../services/api'
import type {
  PiwigoImage,
  PiwigoImagesResponse,
} from '../services/api'

import '../AdminArtworks.css'

const PAGE_SIZE = 24

function AdminArtworks() {
  const [images, setImages] = useState<PiwigoImage[]>([])
  const [paging, setPaging] = useState<PiwigoImagesResponse['paging'] | null>(
    null
  )

  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadArtworks() {
      setLoading(true)
      setError(null)

      try {
        const result = await fetchImages(page, PAGE_SIZE)

        if (cancelled) return

        setImages(result.images)
        setPaging(result.paging)
      } catch (err) {
        if (cancelled) return

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load artworks.'
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadArtworks()

    return () => {
      cancelled = true
    }
  }, [page, reloadKey])

  const filteredImages = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return images

    return images.filter((image) => {
      const searchableText = [
        image.name,
        image.file,
        image.id.toString(),
        image.comment ?? '',
        ...image.tags.map((tag) => tag.name),
      ]
        .join(' ')
        .toLowerCase()

      return searchableText.includes(query)
    })
  }, [images, search])

  const totalCount = paging?.total_count ?? 0
  const currentPage = paging?.page ?? page
  const perPage = paging?.per_page ?? PAGE_SIZE

  const firstArtwork = totalCount === 0
    ? 0
    : currentPage * perPage + 1

  const lastArtwork = Math.min(
    (currentPage + 1) * perPage,
    totalCount
  )

  const hasPreviousPage = currentPage > 0
  const hasNextPage = (currentPage + 1) * perPage < totalCount

  function goToPreviousPage() {
    setPage((current) => Math.max(0, current - 1))
    setSearch('')
  }

  function goToNextPage() {
    setPage((current) => current + 1)
    setSearch('')
  }

  return (
    <section className="admin-artworks">
      <div className="admin-page-heading">
        <span className="admin-eyebrow">
          WORKSPACE / ARTWORKS
        </span>

        <h1>Artworks</h1>

        <p>
          Browse the archive and select an artwork to manage its
          information and supporting materials.
        </p>
      </div>

      <div className="admin-artworks-toolbar">
        <div className="admin-artworks-count">
          <span className="admin-eyebrow">ARCHIVE COLLECTION</span>
          <strong>
            {loading ? '—' : totalCount.toLocaleString()}
          </strong>
          <span>ARTWORKS</span>
        </div>

        <div className="admin-artworks-search">
          <label htmlFor="artwork-search">
            SEARCH THIS PAGE
          </label>

          <input
            id="artwork-search"
            type="search"
            placeholder="Search title, filename, ID or tag..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="admin-artworks-results">
        <div className="admin-section-heading">
          <h2>COLLECTION</h2>

          <span>
            {loading
              ? 'LOADING ARTWORKS'
              : `SHOWING ${firstArtwork}–${lastArtwork} OF ${totalCount}`}
          </span>
        </div>

        {loading && (
          <div className="admin-artworks-message">
            <span className="admin-loading-mark" />
            <p>Loading archive collection...</p>
          </div>
        )}

        {!loading && error && (
          <div className="admin-artworks-message error">
            <h3>Unable to load the collection</h3>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
            >
              TRY AGAIN
            </button>
          </div>
        )}

        {!loading && !error && filteredImages.length === 0 && (
          <div className="admin-artworks-message">
            <h3>No artworks found</h3>
            <p>
              {search
                ? 'Try another search term or clear your search.'
                : 'There are no artworks on this page.'}
            </p>
          </div>
        )}

        {!loading && !error && filteredImages.length > 0 && (
          <div className="admin-artworks-grid">
            {filteredImages.map((image) => (
              <Link
                key={image.id}
                to={`/admin/artworks/${image.id}`}
                className="admin-artwork-card"
              >
                <div className="admin-artwork-thumbnail">
                  <img
                    src={image.thumbnail_url}
                    alt={image.name || image.file}
                    loading="lazy"
                  />

                  <span className="admin-artwork-id">
                    #{image.id}
                  </span>

                  <span className="admin-artwork-open">
                    OPEN ↗
                  </span>
                </div>

                <div className="admin-artwork-card-info">
                  <h3>{image.name || image.file}</h3>

                  <span>
                    {image.width} × {image.height}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && !error && totalCount > 0 && (
          <div className="admin-pagination">
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={!hasPreviousPage}
            >
              ← PREVIOUS
            </button>

            <span>
              PAGE {currentPage + 1}
              {' / '}
              {Math.max(1, Math.ceil(totalCount / perPage))}
            </span>

            <button
              type="button"
              onClick={goToNextPage}
              disabled={!hasNextPage}
            >
              NEXT →
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export default AdminArtworks
