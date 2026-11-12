import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

import {
  addArtworkSupportingImage,
  deleteArtworkSupportingImage,
  fetchArtworkAdditionals,
  fetchSupportingImages,
  updateArtworkSupportingImage,
} from '../services/api'

import type {
  ArtworkAdditionals,
  PiwigoImage,
  SupportingImage,
  SupportingImageInput,
} from '../services/api'

import '../SupportingMaterialsManager.css'

type CmykChannel = 'C' | 'M' | 'Y' | 'K'

type PickerMode =
  | { type: 'source' }
  | { type: 'cmyk'; channel: CmykChannel }

interface SourceEdit {
  label: string
  sort_order: string
}

const channelDetails: Record<
  CmykChannel,
  { name: string; label: string; color: string }
> = {
  C: { name: 'Cyan', label: 'CYAN SEPARATION', color: '#00aeca' },
  M: { name: 'Magenta', label: 'MAGENTA SEPARATION', color: '#dc398b' },
  Y: { name: 'Yellow', label: 'YELLOW SEPARATION', color: '#d6b900' },
  K: { name: 'Black', label: 'BLACK SEPARATION', color: '#222222' },
}

interface Props {
  artworkId: number
}

function SupportingMaterialsManager({ artworkId }: Props) {
  const [additionals, setAdditionals] =
    useState<ArtworkAdditionals | null>(null)

  const [library, setLibrary] = useState<PiwigoImage[]>([])
  const [sourceEdits, setSourceEdits] =
    useState<Record<number, SourceEdit>>({})

  const [loading, setLoading] = useState(true)
  const [libraryLoading, setLibraryLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [busySourceId, setBusySourceId] = useState<number | null>(null)

  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadManager() {
      setLoading(true)
      setLibraryLoading(true)
      setError(null)

      try {
        const [artworkMaterials, libraryResponse] = await Promise.all([
          fetchArtworkAdditionals(artworkId),
          fetchSupportingImages(0, 100),
        ])

        if (cancelled) return

        setAdditionals(artworkMaterials)
        setLibrary(libraryResponse.images)

        const edits: Record<number, SourceEdit> = {}

        artworkMaterials.sources.forEach((source) => {
          edits[source.id] = {
            label: source.label ?? '',
            sort_order: String(source.sort_order),
          }
        })

        setSourceEdits(edits)
      } catch (err) {
        if (cancelled) return

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load supporting materials.'
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
          setLibraryLoading(false)
        }
      }
    }

    loadManager()

    return () => {
      cancelled = true
    }
  }, [artworkId])

  function updateSourceEdit(
    sourceId: number,
    field: keyof SourceEdit,
    value: string
  ) {
    setSourceEdits((current) => ({
      ...current,
      [sourceId]: {
        ...current[sourceId],
        [field]: value,
      },
    }))

    setActionMessage(null)
  }

  async function refreshAdditionals() {
    const updated = await fetchArtworkAdditionals(artworkId)

    setAdditionals(updated)

    const edits: Record<number, SourceEdit> = {}

    updated.sources.forEach((source) => {
      edits[source.id] = {
        label: source.label ?? '',
        sort_order: String(source.sort_order),
      }
    })

    setSourceEdits(edits)
  }

  async function handleSaveSource(source: SupportingImage) {
    const edit = sourceEdits[source.id]

    if (!edit) return

    const sortOrder = Number(edit.sort_order)

    if (
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      setError('Source order must be a non-negative whole number.')
      return
    }

    setBusySourceId(source.id)
    setError(null)
    setActionMessage(null)

    try {
      await updateArtworkSupportingImage(
        artworkId,
        source.id,
        {
          label: edit.label.trim() || null,
          sort_order: sortOrder,
        }
      )

      await refreshAdditionals()
      setActionMessage('Source image updated successfully.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update source image.'
      )
    } finally {
      setBusySourceId(null)
    }
  }

  async function handleRemoveSource(source: SupportingImage) {
    setBusySourceId(source.id)
    setError(null)
    setActionMessage(null)

    try {
      await deleteArtworkSupportingImage(artworkId, source.id)

      await refreshAdditionals()
      setActionMessage('Source assignment removed. Original image preserved.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to remove source assignment.'
      )
    } finally {
      setBusySourceId(null)
    }
  }

  async function handleRemoveCmyk(channel: CmykChannel) {
    const separation = additionals?.cmyk[channel]

    if (!separation) return

    setBusy(true)
    setError(null)
    setActionMessage(null)

    try {
      await deleteArtworkSupportingImage(
        artworkId,
        separation.id
      )

      await refreshAdditionals()
      setActionMessage(
        `${channelDetails[channel].name} assignment removed. Original image preserved.`
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to remove CMYK assignment.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleSelectLibraryImage(image: PiwigoImage) {
    if (!pickerMode || !additionals) return

    const alreadyAssigned = [
      ...additionals.sources,
      ...Object.values(additionals.cmyk).filter(
        (item): item is SupportingImage => item !== null
      ),
    ].some((item) => item.piwigo_image_id === image.id)

    if (alreadyAssigned) return

    let addition: SupportingImageInput

    if (pickerMode.type === 'source') {
      const nextOrder =
        additionals.sources.reduce(
          (highest, source) => Math.max(highest, source.sort_order),
          0
        ) + 1

      const nextNumber = additionals.sources.length + 1

      addition = {
        piwigo_image_id: image.id,
        type: 'source',
        channel: null,
        label: `Source Image ${String(nextNumber).padStart(2, '0')}`,
        sort_order: nextOrder,
      }
    } else {
      const channel = pickerMode.channel

      addition = {
        piwigo_image_id: image.id,
        type: 'cmyk',
        channel,
        label: `${channelDetails[channel].name} Separation`,
        sort_order: ['C', 'M', 'Y', 'K'].indexOf(channel) + 1,
      }
    }

    setBusy(true)
    setError(null)
    setActionMessage(null)

    try {
      await addArtworkSupportingImage(artworkId, addition)

      await refreshAdditionals()

      setPickerMode(null)
      setActionMessage(
        pickerMode.type === 'source'
          ? 'Source image assigned successfully.'
          : `${channelDetails[pickerMode.channel].name} separation assigned successfully.`
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to assign this image.'
      )
    } finally {
      setBusy(false)
    }
  }

  function openSourcePicker() {
    setError(null)
    setPickerMode({ type: 'source' })
  }

  function openCmykPicker(channel: CmykChannel) {
    setError(null)
    setPickerMode({ type: 'cmyk', channel })
  }

  const assignedImageIds = new Set(
    [
      ...(additionals?.sources ?? []),
      ...Object.values(additionals?.cmyk ?? {}).filter(
        (item): item is SupportingImage => item !== null
      ),
    ].map((item) => item.piwigo_image_id)
  )

  const sourceImages = additionals?.sources ?? []

  return (
    <section className="supporting-manager">
      <div className="supporting-manager-heading">
        <div>
          <span className="admin-eyebrow">
            IMAGE RELATIONSHIPS
          </span>
          <h2>Supporting materials</h2>
          <p>
            Manage source images and CMYK separations associated with
            this artwork.
          </p>
        </div>

        <span className="supporting-manager-count">
          {sourceImages.length + Object.values(
            additionals?.cmyk ?? {}
          ).filter(Boolean).length} ASSIGNED
        </span>
      </div>

      {loading && (
        <div className="supporting-manager-message">
          <span className="admin-loading-mark" />
          <p>Loading supporting materials...</p>
        </div>
      )}

      {!loading && error && (
        <div className="supporting-manager-feedback error">
          {error}
        </div>
      )}

      {!loading && additionals && (
        <>
          {actionMessage && (
            <div className="supporting-manager-feedback success">
              {actionMessage}
            </div>
          )}

          <div className="supporting-manager-section">
            <div className="supporting-section-heading">
              <div>
                <span className="admin-eyebrow">01 / SOURCES</span>
                <h3>Source images</h3>
              </div>

              <button
                type="button"
                className="supporting-add-button"
                onClick={openSourcePicker}
                disabled={busy}
              >
                + ADD SOURCE IMAGE
              </button>
            </div>

            {sourceImages.length === 0 ? (
              <div className="supporting-empty">
                <p>No source images assigned to this artwork.</p>
                <span>
                  Add images from the Additionals library.
                </span>
              </div>
            ) : (
              <div className="supporting-source-list">
                {sourceImages.map((source) => {
                  const edit = sourceEdits[source.id] ?? {
                    label: source.label ?? '',
                    sort_order: String(source.sort_order),
                  }

                  return (
                    <article
                      className="supporting-source-card"
                      key={source.id}
                    >
                      <div className="supporting-source-image">
                        <img
                          src={source.thumbnail_url || source.image_url}
                          alt={source.name}
                        />
                      </div>

                      <div className="supporting-source-info">
                        <span className="supporting-image-id">
                          PIWIGO IMAGE #{source.piwigo_image_id}
                        </span>

                        <strong>{source.name}</strong>

                        <div className="supporting-source-fields">
                          <label>
                            <span>DISPLAY LABEL</span>
                            <input
                              type="text"
                              value={edit.label}
                              onChange={(event) =>
                                updateSourceEdit(
                                  source.id,
                                  'label',
                                  event.target.value
                                )
                              }
                              placeholder="Source image label"
                            />
                          </label>

                          <label className="supporting-order-field">
                            <span>ORDER</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={edit.sort_order}
                              onChange={(event) =>
                                updateSourceEdit(
                                  source.id,
                                  'sort_order',
                                  event.target.value
                                )
                              }
                            />
                          </label>
                        </div>

                        <div className="supporting-source-actions">
                          <button
                            type="button"
                            className="supporting-save-button"
                            onClick={() => handleSaveSource(source)}
                            disabled={busySourceId === source.id}
                          >
                            {busySourceId === source.id
                              ? 'SAVING...'
                              : 'SAVE DETAILS'}
                          </button>

                          <button
                            type="button"
                            className="supporting-remove-button"
                            onClick={() => handleRemoveSource(source)}
                            disabled={busySourceId === source.id}
                          >
                            REMOVE ASSIGNMENT
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>

          <div className="supporting-manager-section">
            <div className="supporting-section-heading">
              <div>
                <span className="admin-eyebrow">02 / PROCESS</span>
                <h3>CMYK separations</h3>
              </div>

              <span className="supporting-section-note">
                FOUR CHANNELS
              </span>
            </div>

            <div className="supporting-cmyk-grid">
              {(['C', 'M', 'Y', 'K'] as CmykChannel[]).map(
                (channel) => {
                  const separation = additionals.cmyk[channel]
                  const details = channelDetails[channel]

                  return (
                    <article
                      className="supporting-cmyk-card"
                      key={channel}
                    >
                      <div
                        className="supporting-cmyk-channel"
                        style={{ '--channel-color': details.color } as CSSProperties}
                      >
                        <strong>{channel}</strong>
                        <span>{details.name.toUpperCase()}</span>
                      </div>

                      {separation ? (
                        <>
                          <div className="supporting-cmyk-image">
                            <img
                              src={
                                separation.thumbnail_url ||
                                separation.image_url
                              }
                              alt={separation.name}
                            />
                          </div>

                          <div className="supporting-cmyk-info">
                            <strong>{separation.name}</strong>
                            <span>
                              PIWIGO IMAGE #{separation.piwigo_image_id}
                            </span>
                          </div>

                          <div className="supporting-cmyk-actions">
                            <button
                              type="button"
                              className="supporting-save-button"
                              onClick={() => openCmykPicker(channel)}
                              disabled={busy}
                            >
                              REPLACE
                            </button>

                            <button
                              type="button"
                              className="supporting-remove-button"
                              onClick={() => handleRemoveCmyk(channel)}
                              disabled={busy}
                            >
                              REMOVE
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="supporting-cmyk-empty">
                          <span>NO IMAGE ASSIGNED</span>
                          <button
                            type="button"
                            className="supporting-add-button"
                            onClick={() => openCmykPicker(channel)}
                            disabled={busy}
                          >
                            + CHOOSE IMAGE
                          </button>
                        </div>
                      )}
                    </article>
                  )
                }
              )}
            </div>
          </div>
        </>
      )}

      {pickerMode && (
        <div
          className="supporting-library-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setPickerMode(null)
            }
          }}
        >
          <section
            className="supporting-library-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="supporting-library-title"
          >
            <div className="supporting-library-heading">
              <div>
                <span className="admin-eyebrow">
                  PIWIGO / ADDITIONALS
                </span>
                <h3 id="supporting-library-title">
                  {pickerMode.type === 'source'
                    ? 'Choose a source image'
                    : `Choose ${channelDetails[pickerMode.channel].name} separation`}
                </h3>
                <p>
                  Select an image from the supporting-material library.
                </p>
              </div>

              <button
                type="button"
                className="supporting-library-close"
                onClick={() => setPickerMode(null)}
                disabled={busy}
                aria-label="Close image library"
              >
                ×
              </button>
            </div>

            {libraryLoading ? (
              <div className="supporting-manager-message">
                <span className="admin-loading-mark" />
                <p>Loading image library...</p>
              </div>
            ) : library.length === 0 ? (
              <div className="supporting-empty">
                <p>The Additionals album is empty.</p>
              </div>
            ) : (
              <div className="supporting-library-grid">
                {library.map((image) => {
                  const assigned = assignedImageIds.has(image.id)

                  return (
                    <button
                      type="button"
                      className={`supporting-library-item${assigned ? ' assigned' : ''}`}
                      key={image.id}
                      onClick={() => handleSelectLibraryImage(image)}
                      disabled={assigned || busy}
                    >
                      <div className="supporting-library-image">
                        <img
                          src={image.thumbnail_url || image.image_url}
                          alt={image.name || image.file}
                        />

                        {assigned && (
                          <span className="supporting-assigned-mark">
                            ASSIGNED
                          </span>
                        )}
                      </div>

                      <span className="supporting-library-name">
                        {image.name || image.file}
                      </span>

                      <span className="supporting-library-id">
                        PIWIGO #{image.id}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="supporting-library-footer">
              <span>
                {library.length} IMAGES IN LIBRARY
              </span>
              <button
                type="button"
                onClick={() => setPickerMode(null)}
                disabled={busy}
              >
                CLOSE
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default SupportingMaterialsManager
