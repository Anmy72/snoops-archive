import { Outlet, ScrollRestoration } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'

function MainLayout() {
  return (
    <>
      <ScrollRestoration />

      <div className="archive">
        <Header />

        <main>
          <Outlet />
        </main>

        <Footer />
      </div>
    </>
  )
}

export default MainLayout
