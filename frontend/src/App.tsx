
import './App.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'

import Home from './pages/Home'
import Works from './pages/Works'
import ArtworkDetail from './pages/ArtworkDetail'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import StreetArchive from './pages/StreetArchive'
import About from './pages/About'

import AdminHome from './pages/AdminHome'
import AdminArtworks from './pages/AdminArtworks'
import AdminArtworkDetail from './pages/AdminArtworkDetail'

const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      {
        path: '/',
        element: <Home />,
      },
      {
        path: '/works',
        element: <Works />,
      },
      {
        path: '/works/:id',
        element: <ArtworkDetail />,
      },
      {
        path: '/projects',
        element: <Projects />,
      },
      {
        path: '/projects/:slug',
        element: <ProjectDetail />,
      },
      {
        path: '/street-archive',
        element: <StreetArchive />,
      },
      {
        path: '/about',
        element: <About />,
      },
    ],
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: <AdminHome />,
      },
      {
        path: 'artworks',
        element: <AdminArtworks />,
      },
      {
        path: 'artworks/:id',
        element: <AdminArtworkDetail />,
      },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
