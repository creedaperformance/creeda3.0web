import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, BookOpen, Globe2, ShieldCheck } from 'lucide-react'
import { JsonLd } from '@/components/seo/JsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'
import { createWebPageSchema } from '@/lib/seo/schema'

const missionPageSeo = {
  title: 'CREEDA Mission — Bringing Sports Science to India',
  description:
    'Learn how CREEDA aims to expand access to sports science, injury-aware training, and performance diagnostics across India.',
  path: '/mission',
  keywords: [
    'sports science India mission',
    'athlete performance India',
    'grassroots sports science',
  ],
} as const

export const metadata = createPageMetadata(missionPageSeo)

export default function MissionPage() {
  return (
    <div className="flex min-h-screen flex-col selection:bg-primary/30 selection:text-white bg-[#080C14] text-white">
      <JsonLd
        data={createWebPageSchema({
          path: missionPageSeo.path,
          title: missionPageSeo.title,
          description: missionPageSeo.description,
          type: 'AboutPage',
        })}
      />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-20 lg:pt-32 lg:pb-28 border-b border-border/50">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background"></div>
          
          <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center animate-fade-up">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-8">
              Our Story
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl mb-6">
              Our Mission:<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Transforming India's Sports From the Ground Up</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
              India has 1.4 billion people but chronically underperforms in global sport. The missing link? Sports science. CREEDA brings evidence-based athlete monitoring, injury prevention, and performance diagnostics to every level.
            </p>
          </div>
        </section>

        {/* Feature Blocks */}
        <section className="py-24 bg-background">
          <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 md:gap-16">
              
              {/* Block 1 */}
              <div className="flex flex-col md:flex-row items-center gap-8 group">
                <div className="w-full md:w-1/3 flex justify-center md:justify-end">
                  <div className="h-32 w-32 rounded-3xl bg-primary/5 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                    <BookOpen className="h-12 w-12" />
                  </div>
                </div>
                <div className="w-full md:w-2/3 text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-3">Awareness Gap</h3>
                  <p className="text-lg text-muted-foreground">
                    Most Indian athletes train without any scientific monitoring. We bring sports science literacy to grassroots programs across the country.
                  </p>
                </div>
              </div>

              {/* Block 2 */}
              <div className="flex flex-col md:flex-row-reverse items-center gap-8 group">
                <div className="w-full md:w-1/3 flex justify-center md:justify-start">
                  <div className="h-32 w-32 rounded-3xl bg-accent/5 border border-accent/20 flex items-center justify-center text-accent group-hover:scale-110 transition-transform duration-500">
                    <Globe2 className="h-12 w-12" />
                  </div>
                </div>
                <div className="w-full md:w-2/3 text-center md:text-right">
                  <h3 className="text-2xl font-bold mb-3">Global Standards, Local Roots</h3>
                  <p className="text-lg text-muted-foreground">
                    World-class methodologies adapted for India's unique sporting ecosystem — from gully cricket to Olympic programs.
                  </p>
                </div>
              </div>

              {/* Block 3 */}
              <div className="flex flex-col md:flex-row items-center gap-8 group">
                <div className="w-full md:w-1/3 flex justify-center md:justify-end">
                  <div className="h-32 w-32 rounded-3xl bg-primary/5 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-500">
                    <ShieldCheck className="h-12 w-12" />
                  </div>
                </div>
                <div className="w-full md:w-2/3 text-center md:text-left">
                  <h3 className="text-2xl font-bold mb-3">Democratized Access</h3>
                  <p className="text-lg text-muted-foreground">
                    Elite performance monitoring shouldn't only be for funded programs. CREEDA makes it accessible and affordable for every athlete.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-muted/30 border-t border-border">
          <div className="container mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Join the Movement.</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Whether you are an individual athlete looking to level up or a club wanting to implement an elite sports science department, we are ready.
            </p>
            <Button asChild size="lg" className="rounded-full h-12 px-8 text-base shadow-lg">
              <Link href="/signup">
                Start Your Journey
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer minimal */}
      <footer className="border-t border-border py-8 bg-background">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; 2026 Creeda Performance. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
