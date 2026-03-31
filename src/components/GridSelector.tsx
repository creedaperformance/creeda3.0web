'use client'

import { motion } from 'framer-motion'

interface GridSelectorProps {
  options: string[] | { label: string; icon?: React.ReactNode; value: string }[]
  value: string | string[]
  onChange: (val: any) => void
  multiple?: boolean
  columns?: number
  label?: string
  error?: string
}

export function GridSelector({ 
  options, 
  value, 
  onChange, 
  multiple = false, 
  columns = 2,
  label,
  error
}: GridSelectorProps) {
  const isSelected = (val: string) => {
    if (Array.isArray(value)) return value.includes(val)
    return value === val
  }

  const handleClick = (val: string) => {
    if (multiple) {
      const curr = Array.isArray(value) ? value : []
      if (curr.includes(val)) {
        onChange(curr.filter(v => v !== val))
      } else {
        onChange([...curr, val])
      }
    } else {
      onChange(val)
    }
  }

  return (
    <div className="space-y-4 w-full">
      {label && <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4">{label}</p>}
      
      <div 
        className="grid gap-4" 
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {options.map((opt) => {
          const optValue = typeof opt === 'string' ? opt : opt.value
          const optLabel = typeof opt === 'string' ? opt : opt.label
          const optIcon = typeof opt === 'string' ? null : opt.icon
          const selected = isSelected(optValue)

          return (
            <motion.button
              key={optValue}
              type="button"
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => handleClick(optValue)}
              className={`
                h-20 px-6 rounded-[2rem] border-2 font-black text-[11px] uppercase tracking-widest transition-all glass flex items-center justify-between group relative overflow-hidden
                ${selected ? 'border-india-saffron ring-1 ring-india-saffron/20 bg-india-saffron/10 text-white' : 'border-white/5 hover:border-white/10 text-muted-foreground'}
              `}
            >
              <div className="flex items-center gap-3 relative z-10">
                {optIcon && <div className={`h-6 w-6 ${selected ? 'text-india-saffron' : 'text-muted-foreground'}`}>{optIcon}</div>}
                <span>{optLabel}</span>
              </div>
              
              <div className={`
                h-2.5 w-2.5 rounded-full relative z-10 transition-all duration-500
                ${selected ? 'bg-india-saffron shadow-[0_0_15px_rgba(245,124,0,0.8)] scale-125' : 'bg-white/5'}
              `} />
              
              {selected && (
                <motion.div 
                   layoutId="grid-active-glow"
                   className="absolute inset-0 bg-gradient-to-br from-india-saffron/5 to-transparent pointer-events-none"
                   initial={false}
                />
              )}
            </motion.button>
          )
        })}
      </div>
      {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-2 ml-1 animate-in fade-in slide-in-from-top-1">{error}</p>}
    </div>
  )
}
