import { useMemo, useState } from 'react'
import { streetEntries } from '../data/mockData'

function StreetArchive() {
  const [city, setCity] = useState('all')

  const cities = [...new Set(streetEntries.map((entry) => entry.city))]

  const filteredEntries = useMemo(
    () => city === 'all'
      ? streetEntries
      : streetEntries.filter((entry) => entry.city === city),
    [city]
  )

  return (
    <section className="archive-page">
      <div className="page-title">
        <span className="eyebrow">03 / THE EVERYDAY</span>
        <h1>Street Archive<span className="period">.</span></h1>
        <p>Found typography, urban textures and overlooked visual details.</p>
      </div>

      <div className="archive-controls">
        <label htmlFor="city-filter">Location</label>
        <select
          id="city-filter"
          value={city}
          onChange={(event) => setCity(event.target.value)}
        >
          <option value="all">All cities</option>
          {cities.map((item) => (
            <option value={item} key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="street-preview">
        {filteredEntries.map((entry) => (
          <article className="street-preview-item" key={entry.id}>
            <div className="artwork-placeholder">
              <span>{entry.id}</span>
            </div>
            <h2>{entry.title || entry.id}</h2>
            <p>{entry.description}</p>
            <span>{entry.city} / {entry.date}</span>
          </article>
        ))}
      </div>
    </section>
  )
}

export default StreetArchive
