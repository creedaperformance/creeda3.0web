import { MailCheck } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function VerifyEmailPage() {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 text-center animate-fade-in">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailCheck className="h-10 w-10 absolute animate-pulse opacity-50" />
        <MailCheck className="h-10 w-10 relative z-10" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: 'var(--font-orbitron)' }}>
        Check Your Email
      </h1>
      <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed">
        Please verify your email. An email has been sent to your mailbox. Click the link to verify.
      </p>
      <div className="pt-4 w-full">
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Return to Login</Link>
        </Button>
      </div>
    </div>
  )
}
