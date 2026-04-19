import type { ReactNode } from 'react'
import { IndividualJourneyProvider } from '@/lib/individual-journey-store'
import { createNoIndexMetadata } from '@/lib/seo/noindex'

export const metadata = createNoIndexMetadata()

export default function JourneyLayout({ children }: { children: ReactNode }) {
  return <IndividualJourneyProvider>{children}</IndividualJourneyProvider>
}
