import type { ReactNode } from 'react'
import { IndividualJourneyProvider } from '@/lib/individual-journey-store'

export default function JourneyLayout({ children }: { children: ReactNode }) {
  return <IndividualJourneyProvider>{children}</IndividualJourneyProvider>
}
