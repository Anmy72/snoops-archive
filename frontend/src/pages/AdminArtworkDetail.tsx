
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  fetchImage,
  fetchArtworkMetadata,
  saveArtworkMetadata,
} from '../services/api'

import type {
  PiwigoImage,
  ArtworkMetadata,
  ArtworkMetadataInput,
} from '../services/api'

import SupportingMaterialsManager from './SupportingMaterialsManager'

import '../AdminArtworks.css'
import '../AdminArtworkEditor.css'

interface ArtworkFormValues {
  year: string
  medium: string
  physical_dimensions: string
  description: string
  process_notes: string
}

const emptyForm: ArtworkFormValues = {
  year: '',
  medium: '',
  physical_dimensions: '',
  description: '',
  process_notes: '',
}

function metadataToForm(metadata: ArtworkMetadata): ArtworkFormValues {
  return {
    year: metadata.year?.toString() ?? '',
    medium: metadata.medium ?? '',
    physical_dimensions: metadata.physical_dimensions ?? '',
    description: metadata.description ?? '',
    process_notes: metadata.process_notes ?? '',
  }
}

function AdminArtworkDetail() {
  const { id } = useParams()

  const [image, setImage] = useState<PiwigoImage | null>(null)
  const [form, setForm] = useState<ArtworkFormValues>(emptyForm)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadArtwork() {
      const artworkId = Number(id)

      if (!id || !Number.isInteger(artworkId) || artworkId <= 0) {
        setError('Invalid artwork ID.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      setSaveError(null)
      setSaveSuccess(false)
      setImage(null)
      setForm(emptyForm)

      try {
        const [artwork, metadata] = await Promise.all([
          fetchImage(artworkId),
          fetchArtworkMetadata(artworkId),
        ])

        if (cancelled) return

        setImage(artwork)
        setForm(metadataToForm(metadata))
      } catch (err) {
        if (cancelled) return

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load artwork information.'
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadArtwork()

    return () => {
      cancelled = true
    }
  }, [id])

  function updateField(
    field: keyof ArtworkFormValues,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))

    setSaveSuccess(false)
    setSaveError(null)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!image || !id) return

    const yearValue = form.year.trim()
    const year = yearValue === '' ? null : Number(yearValue)

    if (
      year !== null &&
      (!Number.isInteger(year) || year < 0 || year > 9999)
    ) {
      setSaveError('Please enter a valid year.')
      return
    }

    const metadata: ArtworkMetadataInput = {
      year,
      medium: form.medium.trim() || null,
      physical_dimensions: form.physical_dimensions.trim() || null,
      description: form.description.trim() || null,
      process_notes: form.process_notes.trim() || null,
    }

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const savedMetadata = await saveArtworkMetadata(
        image.id,
        metadata
      )

      setForm(metadataToForm(savedMetadata))
      setSaveSuccess(true)
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'Unable to save artwork information.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-artwork-detail">
      <Link
        to="/admin/artworks"
        className="admin-back-link"
      >
        ← BACK TO ARTWORKS
      </Link>

      {loading && (
        <div className="admin-artworks-message">
          <span className="admin-loading-mark" />
          <p>Loading artwork information...</p>
        </div>
      )}

      {!loading && error && (
        <div className="admin-artworks-message error">
          <h3>Unable to open artwork</h3>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && image && (
        <>
          <div className="admin-page-heading">
            <span className="admin-eyebrow">
              WORKSPACE / ARTWORKS / #{image.id}
            </span>

            <h1>{image.name || image.file}</h1>

            <p>
              Edit the curated information associated with this artwork.
              Changes here will not alter the original Piwigo image.
            </p>
          </div>

          <div className="admin-editor-layout">
            <aside className="admin-editor-preview">
              <span className="admin-eyebrow">
                ARTWORK PREVIEW
              </span>

              <div className="admin-editor-image">
                <img
                  src={image.image_url || image.thumbnail_url}
                  alt={image.name || image.file}
                />
              </div>

              <div className="admin-editor-image-caption">
                <span>PIWIGO IMAGE #{image.id}</span>
                <span>
                  {image.width} × {image.height}
                </span>
              </div>

              <div className="admin-editor-source-details">
                <span className="admin-eyebrow">
                  ORIGINAL FILE
                </span>

                <p>{image.file}</p>

                <span className="admin-eyebrow">
                  ALBUM
                </span>

                <p>
                  {image.categories.length > 0
                    ? image.categories
                        .map((category) => category.name)
                        .filter(Boolean)
                        .join(', ')
                    : 'Not specified'}
                </p>
              </div>
            </aside>

            <div className="admin-editor-form-panel">
              <div className="admin-editor-section-heading">
                <div>
                  <span className="admin-eyebrow">
                    CURATED INFORMATION
                  </span>
                  <h2>Artwork details</h2>
                </div>

                <span className="admin-editor-record-id">
                  ID / {image.id}
                </span>
              </div>

              <form
                className="admin-metadata-form"
                onSubmit={handleSave}
              >
                <div className="admin-form-row">
                  <div className="admin-form-field admin-form-year">
                    <label htmlFor="artwork-year">
                      YEAR
                    </label>

                    <input
                      id="artwork-year"
                      type="number"
                      min="0"
                      max="9999"
                      step="1"
                      placeholder="e.g. 2026"
                      value={form.year}
                      onChange={(event) =>
                        updateField('year', event.target.value)
                      }
                    />
                  </div>

                  <div className="admin-form-field">
                    <label htmlFor="artwork-medium">
                      MEDIUM
                    </label>

                    <input
                      id="artwork-medium"
                      type="text"
                      placeholder="e.g. Acrylic, screen print..."
                      value={form.medium}
                      onChange={(event) =>
                        updateField('medium', event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="admin-form-field">
                  <label htmlFor="artwork-dimensions">
                    PHYSICAL DIMENSIONS
                  </label>

                  <input
                    id="artwork-dimensions"
                    type="text"
                    placeholder="e.g. 50 × 70 cm"
                    value={form.physical_dimensions}
                    onChange={(event) =>
                      updateField(
                        'physical_dimensions',
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="admin-form-field">
                  <label htmlFor="artwork-description">
                    DESCRIPTION
                  </label>

                  <textarea
                    id="artwork-description"
                    rows={6}
                    placeholder="Describe the artwork..."
                    value={form.description}
                    onChange={(event) =>
                      updateField('description', event.target.value)
                    }
                  />

                  <span className="admin-field-hint">
                    This appears in the artwork's public dossier.
                  </span>
                </div>

                <div className="admin-form-field">
                  <label htmlFor="artwork-process">
                    PROCESS NOTES
                  </label>

                  <textarea
                    id="artwork-process"
                    rows={5}
                    placeholder="Document techniques, experiments and process..."
                    value={form.process_notes}
                    onChange={(event) =>
                      updateField('process_notes', event.target.value)
                    }
                  />

                  <span className="admin-field-hint">
                    Additional notes about how the work was made.
                  </span>
                </div>

                <div className="admin-editor-save-area">
                  <div className="admin-editor-save-feedback">
                    {saveSuccess && (
                      <span className="admin-save-success">
                        CHANGES SAVED SUCCESSFULLY
                      </span>
                    )}

                    {saveError && (
                      <span className="admin-save-error">
                        {saveError}
                      </span>
                    )}
                  </div>

                  <button
                    className="admin-save-button"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? 'SAVING...' : 'SAVE CHANGES ↗'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <SupportingMaterialsManager artworkId={image.id} />
        </>
      )}
    </section>
  )
}

export default AdminArtworkDetail
