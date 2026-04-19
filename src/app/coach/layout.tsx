import type { ReactNode } from 'react'

import { createNoIndexMetadata } from '@/lib/seo/noindex'

export const metadata = createNoIndexMetadata()

export default function CoachLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
