import { Link, useParams } from 'react-router-dom'
import { artworks, projects } from '../data/mockData'

function ProjectDetail() {
  const { slug } = useParams()
  const project = projects.find((item) => item.slug === slug)

  if (!project) {
    return (
      <section className="empty-state">
        <h1>Project not found.</h1>
        <Link to="/projects">Return to Projects ↗</Link>
      </section>
    )
  }

  const projectArtworks = artworks.filter((artwork) =>
    project.artworkIds.includes(artwork.id)
  )

  return (
    <article className="project-detail">
      <Link to="/projects" className="text-link">← Back to Projects</Link>

      <header className="detail-header">
        <span className="eyebrow">{project.id} / {project.year}</span>
        <h1>{project.title}<span className="period">.</span></h1>
        <p>{project.description}</p>
      </header>

      <section className="project-artworks">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE COLLECTION</span>
            <h2>Works within this project</h2>
          </div>
          <span>{projectArtworks.length} works</span>
        </div>

        <div className="works-grid">
          {projectArtworks.map((artwork) => (
            <Link
              to={`/works/${artwork.id}`}
              className="work-card"
              key={artwork.id}
            >
              <div className="artwork-placeholder">
                <span>{artwork.id}</span>
              </div>
              <div className="work-info">
                <span>{artwork.title}</span>
                <span>{artwork.medium}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </article>
  )
}

export default ProjectDetail
