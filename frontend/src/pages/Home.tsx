
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchImages, type PiwigoImage } from '../services/api'

function Home() {
  const [images, setImages] = useState<PiwigoImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Retrieve the artwork collection from the archive API.
  useEffect(() => {
    let active = true

    async function loadImages() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetchImages()

        if (active) {
          setImages(response.images)
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

    loadImages()

    return () => {
      active = false
    }
  }, [reloadKey])

  // Retry loading the collection.
  const retryLoading = () => {
    setReloadKey((current) => current + 1)
  }

  return (
    <>
      {/* INTRODUCTION */}
      <section className="introduction">
        <div className="identity">
          <span className="eyebrow">
            INDEPENDENT CREATIVE ARCHIVE
          </span>

          <h1>
            Lost and<br />
            Found<span className="period">.</span>
          </h1>
        </div>

        <div className="intro-copy">
          <p>
            An ongoing practice of graphic experimentation
            and visual exploration.
          </p>

          <span className="intro-note">
            A record of things made, found, changed and rediscovered.
          </span>
        </div>
      </section>

      {/* THE COLLECTION */}
      <section className="page-section endless-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              01 / THE COLLECTION
            </span>

            <h2>Selected Works</h2>
          </div>

          <Link to="/works" className="text-link">
            Explore all works ↗
          </Link>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="archive-feedback" aria-live="polite">
            <span className="eyebrow">
              CONNECTING TO THE ARCHIVE
            </span>
            <p>Retrieving collected works...</p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="archive-feedback archive-error">
            <span className="eyebrow">
              CONNECTION ERROR
            </span>

            <p>{error}</p>

            <button onClick={retryLoading}>
              Try again ↗
            </button>
          </div>
        )}

        {/* EMPTY COLLECTION */}
        {!loading && !error && images.length === 0 && (
          <div className="archive-feedback">
            <span className="eyebrow">
              NOTHING HERE. YET.
            </span>

            <p>
              The archive is waiting for something to be added.
            </p>
          </div>
        )}

        {/* ACTUAL PIWIGO IMAGES */}
        {!loading && !error && images.length > 0 && (
          <div className="works-grid">
            {images.map((image, index) => (
              <Link
                to={`/works/${image.id}`}
                className="work-card"
                key={image.id}
                style={{
                  animationDelay: `${-(index % 3) * 2}s`,
                }}
              >
                <div className="artwork-image">
                  <img
                    src={image.thumbnail_url}
                    alt={image.name || image.file}
                    loading="lazy"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ABOUT */}
      <section className="about-section">
        <span className="eyebrow">
          02 / ABOUT THE ARCHIVE
        </span>

        <h2>
          A place for things<br />
          worth keeping.
        </h2>

        <p>
          An evolving record of visual curiosity, experimentation,
          references and creative discoveries.
        </p>

        <Link to="/about" className="text-link">
          More about the archive ↗
        </Link>
      </section>
    </>
  )
}

export default Home
