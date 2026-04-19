import Link from 'next/link'
import { WifiOff, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createNoIndexMetadata } from '@/lib/seo/noindex'

export const metadata = createNoIndexMetadata('Offline | CREEDA')

export default function OfflinePage() {
  return (
    <div className="min-h-[100dvh] bg-[var(--background)] flex flex-col items-center justify-center px-6 text-center">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-[var(--saffron)] opacity-[0.04] blur-[100px] rounded-full" />

      <div className="relative z-10 max-w-sm mx-auto">
        {/* Icon */}
        <div className="h-20 w-20 rounded-3xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-8">
          <WifiOff className="h-10 w-10 text-white/30" strokeWidth={1.5} />
        </div>

        <h1 className="text-2xl font-extrabold text-white mb-3 tracking-tight" style={{ fontStyle: 'normal' }}>
          You&apos;re Offline
        </h1>

        <p className="text-sm text-white/40 font-medium leading-relaxed mb-8" style={{ fontStyle: 'normal', textTransform: 'none', letterSpacing: 'normal' }}>
          Don&apos;t worry — your data is saved locally. Connect to the internet to sync your latest sessions and get updated plans.
        </p>

        {/* Cached actions */}
        <div className="space-y-3 mb-8">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-left">
            <p className="text-xs font-semibold text-white/60 mb-1" style={{ fontStyle: 'normal' }}>Available Offline</p>
            <ul className="text-xs text-white/35 space-y-1" style={{ fontStyle: 'normal', textTransform: 'none', letterSpacing: 'normal' }}>
              <li>✓ View cached dashboard data</li>
              <li>✓ Log daily wellness (auto-syncs later)</li>
              <li>✓ Review saved training plans</li>
              <li>✓ Access downloaded education modules</li>
            </ul>
          </div>
        </div>

        <Button
          asChild
          className="w-full h-12 rounded-xl bg-white/[0.06] text-white font-semibold text-sm border border-white/[0.08] hover:bg-white/[0.1] transition-all"
        >
          <Link href="/athlete/dashboard">
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
