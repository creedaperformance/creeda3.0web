'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, Activity, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageToggle, useTranslation } from '@/lib/i18n/LanguageProvider'
import { getRoleHomeRoute, isAppRole } from '@/lib/role_routes'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export function Navbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const { t } = useTranslation()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
      if (session) {
        supabase.from('profiles').select('role').eq('id', session.user.id).single()
          .then(({ data }) => setUserRole(data?.role || null))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
      if (session) {
        supabase.from('profiles').select('role').eq('id', session.user.id).single()
          .then(({ data }) => setUserRole(data?.role || null))
      } else {
        setUserRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const dashboardLink = isLoggedIn && isAppRole(userRole) ? getRoleHomeRoute(userRole) : '/signup'
  const loginText = isLoggedIn ? t('landing.cta_dashboard', 'Go to Dashboard') : t('landing.cta_start', 'Start Your Journey')

  // Hide on dashboard / internal pages (they have their own nav)
  const isDashboard = pathname?.startsWith('/athlete/') ||
    pathname?.startsWith('/coach/') ||
    pathname?.startsWith('/individual/') ||
    pathname?.startsWith('/learn')

  if (isDashboard) return null

  const navLinks = [
    { href: '/#individuals', label: t('landing.section_individuals', 'Individuals') },
    { href: '/#athletes', label: t('landing.section_athletes', 'Athletes') },
    { href: '/#how-it-works', label: t('landing.section_how', 'How It Works') },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#04070A]/80 backdrop-blur-xl border-b border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-[var(--saffron)] flex items-center justify-center shadow-lg shadow-[var(--saffron-glow)] group-hover:shadow-xl transition-shadow">
              <Activity className="text-black h-4.5 w-4.5" strokeWidth={3} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              Creeda
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/50 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <LanguageToggle />

            <Button
              asChild
              size="sm"
              className="hidden sm:inline-flex h-9 px-5 rounded-full bg-[var(--saffron)] text-black font-bold text-xs hover:brightness-110 transition-all shadow-lg shadow-[var(--saffron-glow)]"
            >
              <Link href={dashboardLink}>
                {loginText}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-white/60 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-[#04070A]/95 backdrop-blur-xl border-t border-white/[0.04]"
          >
            <div className="px-4 py-6 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-white/[0.06]">
                <Button
                  asChild
                  className="w-full h-12 rounded-xl bg-[var(--saffron)] text-black font-bold text-sm hover:brightness-110 shadow-lg"
                >
                  <Link href={dashboardLink} onClick={() => setIsOpen(false)}>
                    {loginText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
