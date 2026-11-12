import { NavLink, Outlet, ScrollRestoration } from 'react-router-dom'
import '../Admin.css'

function AdminLayout() {
  return (
    <>
      <ScrollRestoration />

      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <span className="admin-brand-mark">S/A</span>
            <div>
              <span className="admin-brand-title">SNOOPS ARCHIVE</span>
              <span className="admin-brand-subtitle">MANAGEMENT</span>
            </div>
          </div>

          <div className="admin-nav-section">
            <span className="admin-nav-label">WORKSPACE</span>

            <nav className="admin-nav">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  isActive ? 'admin-nav-link active' : 'admin-nav-link'
                }
              >
                <span className="admin-nav-number">01</span>
                Overview
              </NavLink>

              <NavLink
                to="/admin/artworks"
                className={({ isActive }) =>
                  isActive ? 'admin-nav-link active' : 'admin-nav-link'
                }
              >
                <span className="admin-nav-number">02</span>
                Artworks
              </NavLink>

              <NavLink
                to="/admin/supporting-materials"
                className={({ isActive }) =>
                  isActive ? 'admin-nav-link active' : 'admin-nav-link'
                }
              >
                <span className="admin-nav-number">03</span>
                Supporting Materials
              </NavLink>
            </nav>
          </div>

          <div className="admin-sidebar-bottom">
            <span className="admin-status-indicator" />
            <span>DEVELOPMENT ENVIRONMENT</span>
          </div>
        </aside>

        <main className="admin-main">
          <header className="admin-topbar">
            <span> SNOOPS ARCHIVE / MANAGEMENT</span>
            <NavLink to="/" className="admin-view-site">
              VIEW ARCHIVE ↗
            </NavLink>
          </header>

          <div className="admin-workspace">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  )
}

export default AdminLayout
