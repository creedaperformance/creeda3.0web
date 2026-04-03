import Image from 'next/image'
import { AuthListener } from '@/components/auth-listener'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AuthListener />
      {/* Left Pane - Branding & Image (hidden on mobile) */}
      <div className="relative hidden w-1/2 lg:flex items-center justify-center overflow-hidden bg-primary">
        {/* Abstract Indian/Sports Pattern Background Idea - Using CSS gradients/blobs */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-creeda-navy to-accent opacity-90 mixing-blend-multiply pointer-events-none" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent rounded-full blur-[120px] opacity-40 mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-creeda-teal rounded-full blur-[120px] opacity-20 mix-blend-screen" />
        
        <div className="relative z-10 flex flex-col items-start justify-center px-16 text-primary-foreground max-w-xl">
          <div className="mb-6 shrink-0">
            <Image
              src="/creeda-performance-bgr.png"
              alt="Creeda Performance"
              width={720}
              height={360}
              priority
              className="h-28 w-auto object-contain shrink-0"
            />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-6 leading-tight">
            Welcome to your body&apos;s control room.
          </h1>
          <p className="text-lg text-blue-100 font-medium mb-8 leading-relaxed">
            CREEDA brings sports-science thinking to two different journeys in India: sharper athlete performance and healthier everyday living with clearer daily guidance.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-sm font-semibold text-blue-200">
              <span className="w-8 h-px bg-blue-400"></span>
              <p>For Individuals: sleep, stress, movement, strength, and healthy-living guidance</p>
            </div>
            <div className="flex items-center space-x-3 text-sm font-semibold text-emerald-200/90">
              <span className="w-8 h-px bg-emerald-300/80"></span>
              <p>For Athletes: readiness, load, rehab context, and competition-aware decisions</p>
            </div>
            <div className="flex items-center space-x-3 text-sm font-semibold text-accent/80">
              <span className="w-8 h-px bg-accent/80"></span>
              <p>Built for Indian routines, not imported wellness templates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane - Auth Form */}
      <div className="flex w-full flex-col justify-center px-8 sm:px-16 lg:w-1/2 xl:px-32 relative">
        <div className="absolute top-8 left-8 lg:hidden flex items-center gap-3 shrink-0">
          <Image
            src="/creeda-performance-bgr.png"
            alt="Creeda Performance"
            width={320}
            height={160}
            priority
            className="h-12 w-auto object-contain shrink-0"
          />
        </div>
        <div className="mx-auto w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
