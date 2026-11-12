function AdminHome() {
  return (
    <section className="admin-home">
      <div className="admin-page-heading">
        <span className="admin-eyebrow">WORKSPACE / OVERVIEW</span>
        <h1>Management</h1>
        <p>
          Manage the artwork, information and materials that make up
          Snoops Archive.
        </p>
      </div>

      <div className="admin-welcome">
        <span className="admin-eyebrow">ARCHIVE MANAGEMENT</span>
        <h2>Welcome to the workshop.</h2>
        <p>
          This is where the archive is maintained. Select a section
          from the sidebar to begin managing its contents.
        </p>
      </div>

      <div className="admin-section-heading">
        <h2>WORKSPACE</h2>
        <span>AVAILABLE SECTIONS</span>
      </div>

      <div className="admin-quick-links">
        <a href="/admin/artworks" className="admin-quick-link">
          <span className="admin-quick-number">01</span>
          <div>
            <h3>Artworks</h3>
            <p>Edit artwork information and metadata.</p>
          </div>
          <span className="admin-quick-arrow">↗</span>
        </a>

        <div className="admin-quick-link disabled">
          <span className="admin-quick-number">02</span>
          <div>
            <h3>Supporting Materials</h3>
            <p>Manage source images and CMYK separations.</p>
          </div>
          <span className="admin-coming-soon">COMING SOON</span>
        </div>
      </div>
    </section>
  )
}

export default AdminHome
