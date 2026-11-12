import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchImage,
  fetchImages,
  fetchArtworkAdditionals,
  fetchArtworkMetadata,
  type PiwigoImage,
  type ArtworkAdditionals,
  type ArtworkMetadata,
} from '../services/api'

type EnlargedImage = {
  url: string
  alt: string
  caption: string
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Date not recorded'

  const date = new Date(value.replace(' ', 'T'))

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}


function ArtworkDetail() {
  const { id } = useParams()

  const [artwork, setArtwork] = useState<PiwigoImage | null>(null)
  const [images, setImages] = useState<PiwigoImage[]>([])
  const [additionals, setAdditionals] =
    useState<ArtworkAdditionals | null>(null)
  const [metadata, setMetadata] =
    useState<ArtworkMetadata | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enlargedImage, setEnlargedImage] =
    useState<EnlargedImage | null>(null)

  useEffect(() => {
    let active = true

    async function loadArtwork() {
      if (!id) {
        setError('No artwork ID was provided.')
        setLoading(false)
        return
      }

      const artworkId = Number(id)

      setLoading(true)
      setError(null)
      setArtwork(null)
      setAdditionals(null)
      setMetadata(null)
      setImages([])
      setEnlargedImage(null)

      try {
        const image = await fetchImage(artworkId)

        if (!active) return

        setArtwork(image)

        // Supporting materials load independently.
        // Their failure must not affect the main artwork.
        fetchArtworkAdditionals(artworkId)
          .then((result) => {
            if (active) setAdditionals(result)
          })
          .catch(() => {
            if (active) setAdditionals(null)
          })

        // Curated metadata also loads independently.
        // The Piwigo information remains available if this fails.
        fetchArtworkMetadata(artworkId)
          .then((result) => {
            if (active) setMetadata(result)
          })
          .catch(() => {
            if (active) setMetadata(null)
          })

        // The collection is used to determine previous and next works.
        try {
          const collection = await fetchImages()

          if (active) {
            setImages(collection.images)
          }
        } catch {
          // The artwork can still be displayed without navigation.
          if (active) setImages([])
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Something went wrong while loading this artwork.'
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadArtwork()

    return () => {
      active = false
    }
  }, [id])

  // Handle Escape and prevent background scrolling while enlarged.
  useEffect(() => {
    if (!enlargedImage) return

    const previousOverflow = document.body.style.overflow

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setEnlargedImage(null)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enlargedImage])

  if (loading) {
    return (
      <section className="empty-state">
        <p className="eyebrow">SNOOPS ARCHIVE</p>
        <h1>Retrieving artwork...</h1>
      </section>
    )
  }

  if (error || !artwork) {
    return (
      <section className="empty-state">
        <h1>{error || 'Artwork not found.'}</h1>
        <Link to="/works">Return to Works ↗</Link>
      </section>
    )
  }

  const currentIndex = images.findIndex(
    (image) => image.id === artwork.id
  )

  const previous =
    currentIndex > 0 ? images[currentIndex - 1] : null

  const next =
    currentIndex >= 0 && currentIndex < images.length - 1
      ? images[currentIndex + 1]
      : null

  const title = artwork.name || artwork.file

  const curatedDescription = metadata?.description?.trim()

  const description =
    curatedDescription ||
    artwork.comment?.trim() ||
    'No description has been added to this work yet.'

  const processNotes = metadata?.process_notes?.trim()

  const artworkDate = formatDate(
    artwork.date_creation || artwork.date_available
  )

  const sources = additionals?.sources ?? []
  const cmyk = additionals?.cmyk

  const hasSources = sources.length > 0

  const hasCmyk = Boolean(
    cmyk && Object.values(cmyk).some((image) => image !== null)
  )

  return (
    <>
      <article className="artwork-detail">
        <Link to="/works" className="text-link">
          ← Back to Works
        </Link>

        <header className="detail-header">
          <span className="eyebrow">
            WORK / {String(artwork.id).padStart(4, '0')}
          </span>

          <h1>
            {title}<span className="period">.</span>
          </h1>
        </header>

        <div className="artwork-product-layout">
          <aside className="artwork-sidebar">
            <section className="artwork-description">
              <span className="eyebrow">DESCRIPTION</span>
              <p>{description}</p>
            </section>

            {processNotes && (
              <section className="artwork-description">
                <span className="eyebrow">PROCESS NOTES</span>
                <p>{processNotes}</p>
              </section>
            )}
          </aside>

          <div className="detail-image-container">
            <figure className="detail-image">
              <img src={artwork.image_url} alt={title} />
            </figure>

            <button
              type="button"
              className="enlarge-image-button"
              onClick={() =>
                setEnlargedImage({
                  url: artwork.image_url,
                  alt: title,
                  caption: title,
                })
              }
              aria-haspopup="dialog"
              aria-label={`Enlarge ${title}`}
            >
              ENLARGE IMAGE <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>

        <section className="artwork-bottom-details">
          <div className="artwork-details">
            <span className="eyebrow">DETAILS</span>

            <dl className="artwork-metadata">
              <div>
                <dt>ALBUM</dt>
                <dd>
                  {artwork.categories.length > 0
                    ? artwork.categories
                        .map((category) => category.name)
                        .filter(Boolean)
                        .join(', ')
                    : 'Uncategorised'}
                </dd>
              </div>

              <div>
                <dt>DATE</dt>
                <dd>{artworkDate}</dd>
              </div>

              {metadata?.year != null && (
                <div>
                  <dt>YEAR</dt>
                  <dd>{metadata.year}</dd>
                </div>
              )}

              {metadata?.medium?.trim() && (
                <div>
                  <dt>MEDIUM</dt>
                  <dd>{metadata.medium}</dd>
                </div>
              )}

              {metadata?.physical_dimensions?.trim() && (
                <div>
                  <dt>PHYSICAL DIMENSIONS</dt>
                  <dd>{metadata.physical_dimensions}</dd>
                </div>
              )}

              <div>
                <dt>DIGITAL DIMENSIONS</dt>
                <dd>{artwork.width} × {artwork.height} px</dd>
              </div>


              {artwork.author && (
                <div>
                  <dt>AUTHOR</dt>
                  <dd>{artwork.author}</dd>
                </div>
              )}
            </dl>
          </div>

          {artwork.tags.length > 0 && (
            <div className="artwork-tags">
              <span className="eyebrow">TAGS</span>

              <div className="tag-list">
                {artwork.tags.map((tag) => (
                  <span key={tag.id}>{tag.name}</span>
                ))}
              </div>
            </div>
          )}
        </section>

        {hasSources || hasCmyk ? (
          <section className="artwork-additionals">
            <span className="eyebrow">ADDITIONALS</span>

            <div
              className={[
                'additionals-layout',
                hasSources && hasCmyk
                  ? 'additionals-layout--split'
                  : 'additionals-layout--single',
              ].join(' ')}
            >
              {hasSources && (
                <div className="additionals-sources">
                  <span className="eyebrow">SOURCE IMAGES</span>

                  <div className="source-image-grid">
                    {sources.map((source) => {
                      const label = source.label || source.name

                      return (
                        <figure
                          className="source-image-item"
                          key={source.id}
                        >
                          <img
                            src={source.image_url}
                            alt={label}
                            loading="lazy"
                          />

                          <button
                            type="button"
                            className="additional-enlarge-button"
                            onClick={() =>
                              setEnlargedImage({
                                url: source.image_url,
                                alt: label,
                                caption: label,
                              })
                            }
                            aria-haspopup="dialog"
                            aria-label={`Enlarge ${label}`}
                          >
                            ENLARGE <span aria-hidden="true">↗</span>
                          </button>

                          {label && (
                            <figcaption>{label}</figcaption>
                          )}
                        </figure>
                      )
                    })}
                  </div>
                </div>
              )}

              {hasCmyk && cmyk && (
                <div className="additionals-cmyk">
                  <span className="eyebrow">CMYK SEPARATIONS</span>

                  <div className="cmyk-grid">
                    {(['C', 'M', 'Y', 'K'] as const).map((channel) => {
                      const separation = cmyk[channel]

                      return (
                        <figure
                          className={`cmyk-item cmyk-item--${channel.toLowerCase()}`}
                          key={channel}
                        >
                          <span className="cmyk-channel">
                            {channel}
                          </span>

                          {separation ? (
                            <>
                              <img
                                src={separation.image_url}
                                alt={`${channel} colour separation`}
                                loading="lazy"
                              />

                              <button
                                type="button"
                                className="additional-enlarge-button"
                                onClick={() =>
                                  setEnlargedImage({
                                    url: separation.image_url,
                                    alt: `${channel} colour separation`,
                                    caption: `${channel} — ${separation.label || 'Colour separation'}`,
                                  })
                                }
                                aria-haspopup="dialog"
                                aria-label={`Enlarge ${channel} colour separation`}
                              >
                                ENLARGE <span aria-hidden="true">↗</span>
                              </button>
                            </>
                          ) : (
                            <div className="cmyk-empty">
                              <span>NOT AVAILABLE</span>
                            </div>
                          )}
                        </figure>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : null}

        <nav className="detail-pagination" aria-label="Artwork navigation">
          {previous ? (
            <Link to={`/works/${previous.id}`}>
              ← {previous.name || previous.file}
            </Link>
          ) : (
            <span />
          )}

          {next && (
            <Link to={`/works/${next.id}`}>
              {next.name || next.file} →
            </Link>
          )}
        </nav>
      </article>

      {enlargedImage && (
        <div
          className="image-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Enlarged view of ${enlargedImage.alt}`}
          onClick={() => setEnlargedImage(null)}
        >
          <button
            type="button"
            className="image-lightbox-close"
            onClick={() => setEnlargedImage(null)}
            aria-label="Close enlarged image"
          >
            ×
          </button>

          <div
            className="image-lightbox-content"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={enlargedImage.url}
              alt={enlargedImage.alt}
            />
            <span>{enlargedImage.caption}</span>
          </div>
        </div>
      )}
    </>
  )
}

export default ArtworkDetail
