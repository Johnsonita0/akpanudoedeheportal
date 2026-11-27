import { useEffect } from 'react'
import AdminAccessPage from './pages/AdminAccessPage'
import PublicSitePage from './pages/PublicSitePage'
import RegistrationPage from './pages/RegistrationPage'
import SupporterPortalPage from './pages/SupporterPortalPage'

function AdminRouteRedirect() {
  useEffect(() => {
    window.location.replace('/admin')
  }, [])

  return <AdminAccessPage />
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  if (path === '/register') return <RegistrationPage />
  if (path === '/portal') return <SupporterPortalPage />
  if (path === '/admin' || path.startsWith('/admin/')) return <AdminAccessPage />
  if (path === '/coordinator' || path.startsWith('/dashboard') || /^\/members\/[^/]+$/.test(path)) {
    return <AdminRouteRedirect />
  }

  return <PublicSitePage path={path} />
}
