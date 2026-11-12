import { Link } from 'react-router-dom'
import { projects } from '../data/mockData'

function Projects() {
  return (
    <section className="archive-page">
      <div className="page-title">
        <span className="eyebrow">02 / COLLECTIONS OF IDEAS</span>
        <h1>Projects<span className="period">.</span></h1>
        <p>Larger bodies of work, connected experiments and evolving ideas.</p>
      </div>

      <div className="project-list">
        {projects.map((project) => (
          <Link
            to={`/projects/${project.slug}`}
            className="project-row"
            key={project.id}
          >
            <span>{project.id}</span>
            <h2>{project.title}</h2>
            <span>{project.year}</span>
            <span>{project.status}</span>
            <span>↗</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default Projects
