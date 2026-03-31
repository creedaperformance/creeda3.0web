'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

export function NavbarWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  
  // Hide the top navbar on all internal app routes
  // (those routes use DashboardLayout or have their own headers)
  const hideNavbarRoutes = [
    '/athlete',
    '/coach',
    '/individual',
    '/dashboard',
    '/onboarding',
    '/learn',
    '/fitstart',
  ]
  
  const shouldHideNavbar = hideNavbarRoutes.some(route => pathname.startsWith(route))

  if (shouldHideNavbar) {
    return null
  }

  return <>{children}</>
}
