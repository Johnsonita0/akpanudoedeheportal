import { useEffect } from 'react'
import AdminAccessPage from './pages/AdminAccessPage'
import DashboardPage from './pages/DashboardPage'
import PublicSitePage from './pages/PublicSitePage'
import RegistrationPage from './pages/RegistrationPage'
import SupporterPortalPage from './pages/SupporterPortalPage'
import SupportGroupDashboardPage from './pages/SupportGroupDashboardPage'

function AdminRouteRedirect() {
  useEffect(() => {
    window.location.replace('/admin')
  }, [])

  return <AdminAccessPage />
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'

  if (path === '/register') return <RegistrationPage />
  if (path === '/group-dashboard') return <SupportGroupDashboardPage />
  if (path === '/portal') return <SupporterPortalPage />
  if (path === '/admin' || path.startsWith('/admin/')) return <AdminAccessPage />
  if (path === '/dashboard' || path.startsWith('/dashboard/')) return <DashboardPage />
  if (path === '/coordinator' || path.startsWith('/coordinator/') || /^\/members\/[^/]+$/.test(path)) return <AdminRouteRedirect />

  return <PublicSitePage path={path} />
}
