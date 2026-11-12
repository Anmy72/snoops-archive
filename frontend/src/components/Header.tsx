import { NavLink } from 'react-router-dom'

const navigation = [
  { label: 'Works', path: '/works' },
  { label: 'Projects', path: '/projects' },
  { label: 'Street Archive', path: '/street-archive' },
  { label: 'About', path: '/about' },
]

function Header() {
  return (
    <header className="site-header">
      <NavLink to="/" className="site-logo">
        SNOOP'S <span>ARCHIVE.</span>
      </NavLink>

      <nav className="site-navigation" aria-label="Main navigation">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? 'navigation-link active' : 'navigation-link'
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

export default Header
