import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PricingCardProps {
  title: string
  price: string
  description: string
  features: string[]
  highlight?: string
  ctaText: string
  onCtaClick?: () => void
  isPopular?: boolean
  tier: string
}

export function PricingCard({
  title,
  price,
  description,
  features,
  highlight,
  ctaText,
  onCtaClick,
  isPopular = false,
}: PricingCardProps) {
  return (
    <div className={`relative rounded-[2.5rem] p-8 transition-all duration-300 flex flex-col h-full border-2 ${
      isPopular 
        ? 'bg-card border-primary shadow-2xl shadow-primary/20 scale-[1.02] z-10' 
        : 'bg-card/40 border-border/50 hover:border-white/10'
    }`}>
      {highlight && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 bg-gradient-to-br from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-[0_0_20px_rgba(255,107,0,0.4)] whitespace-nowrap z-20">
          {highlight}
        </div>
      )}

      {isPopular && (
        <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] blur-3xl -z-10 animate-pulse" />
      )}

      <div className="mb-8">
        <h3 className="text-2xl font-black text-white tracking-tight uppercase mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground font-medium leading-relaxed">{description}</p>
      </div>

      <div className="mb-8 flex items-baseline">
        <span className="text-5xl font-black text-white tracking-tighter">{price}</span>
        {price !== '₹0' && <span className="ml-2 text-lg font-bold text-muted-foreground">/month</span>}
      </div>

      <ul className="mb-10 space-y-4 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-4">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <span className="text-sm text-muted-foreground font-semibold leading-snug">{feature}</span>
          </li>
        ))}
      </ul>

      <Button 
        onClick={onCtaClick}
        variant={isPopular ? 'default' : 'outline'}
        className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
          isPopular 
            ? 'bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/30 active:scale-95' 
            : 'border-white/10 text-white hover:bg-card/5 active:scale-95'
        }`}
      >
        {ctaText}
      </Button>
    </div>
  )
}
