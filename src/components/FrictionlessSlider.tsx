'use client'

import { motion, useMotionValue, useTransform } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'

interface FrictionlessSliderProps {
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  label?: string
  leftLabel?: string
  rightLabel?: string
}

export function FrictionlessSlider({ 
  value, 
  onChange, 
  min = 1, 
  max = 10, 
  label,
  leftLabel = "Low",
  rightLabel = "High"
}: FrictionlessSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  
  // Motion values for kinetic feedback
  const x = useMotionValue(0)
  const range = max - min
  
  // Dynamic color transitions: Green to Saffron
  const color = useTransform(
    x,
    [0, 100], 
    ["#4CAF50", "#F57C00"]
  )

  const handleDrag = (_: any, info: any) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const newXShort = Math.max(0, Math.min(rect.width, info.point.x - rect.left))
      const percent = newXShort / rect.width
      const newVal = Math.round(min + (percent * range))
      
      if (newVal !== value) {
        onChange(newVal)
      }
      x.set(newXShort)
    }
  }

  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth
      const percent = (value - min) / range
      x.set(percent * width)
    }
  }, [value, min, range, x])

  return (
    <div className="space-y-6 w-full py-4">
      {label && (
        <div className="flex justify-between items-end mb-2">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
          <motion.span 
            className="text-4xl font-black text-glow-saffron"
            style={{ 
              color: useTransform(
                x,
                [0, containerRef.current?.offsetWidth || 100], 
                ["#4CAF50", "#F57C00"]
              ) 
            }}
          >
            {value}
          </motion.span>
        </div>
      )}
      
      <div 
        ref={containerRef}
        className="relative h-24 bg-card/30 rounded-3xl border border-white/5 overflow-hidden flex items-center px-4 cursor-pointer"
        onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const percent = (e.clientX - rect.left) / rect.width
            onChange(Math.round(min + percent * range))
        }}
      >
        {/* Track Gradient Background */}
        <motion.div 
          className="absolute inset-0 opacity-20"
          style={{ 
            background: useTransform(
              x,
              [0, containerRef.current?.offsetWidth || 300],
              [
                "linear-gradient(90deg, #4CAF50 0%, transparent 100%)",
                "linear-gradient(90deg, #4CAF50 0%, #F57C00 100%)"
              ]
            )
          }}
        />

        {/* The Handle / SVG Slider Indicator */}
        <motion.div
            drag="x"
            dragConstraints={containerRef}
            dragElastic={0}
            dragMomentum={false}
            onDrag={handleDrag}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            className="absolute left-0 z-20"
            style={{ x }}
        >
            <div className="h-20 w-12 flex items-center justify-center -ml-6 group">
                <div className="h-16 w-1 bg-white rounded-full group-hover:scale-y-110 transition-transform" />
                <motion.div 
                    className="absolute h-12 w-12 rounded-full border-4 border-white shadow-2xl"
                    style={{ backgroundColor: color }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                />
            </div>
        </motion.div>

        {/* Visual Cues */}
        <div className="absolute inset-x-8 flex justify-between pointer-events-none opacity-20">
            {[...Array(range + 1)].map((_, i) => (
                <div key={i} className="h-8 w-[1px] bg-white" />
            ))}
        </div>
      </div>

      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50 px-2">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  )
}
