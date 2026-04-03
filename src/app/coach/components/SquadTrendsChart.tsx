'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false })

interface SquadTrendPoint {
  date: string
  Readiness: number
}

export function SquadTrendsChart({ data }: { data: SquadTrendPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const measure = () => {
      const rect = container.getBoundingClientRect()
      const width = Math.max(0, Math.floor(rect.width))
      const height = Math.max(0, Math.floor(rect.height))

      setDimensions((current) => {
        if (!width || !height) return current
        if (current?.width === width && current.height === height) return current
        return { width, height }
      })
    }

    const frameId = window.requestAnimationFrame(measure)
    const observer = new ResizeObserver(() => {
      measure()
    })
    observer.observe(container)

    return () => {
      window.cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [])

  if (!data || data.length === 0) return null

  return (
    <div ref={containerRef} className="h-full w-full min-h-[240px] min-w-0">
      {dimensions ? (
        <LineChart
          width={dimensions.width}
          height={dimensions.height}
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#94a3b8" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            tick={{ fontWeight: 700 }}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            domain={[0, 100]} 
            tickCount={6}
            tick={{ fontWeight: 700 }}
          />
          <Tooltip
            contentStyle={{ 
              backgroundColor: '#ffffff', 
              borderColor: '#e2e8f0', 
              borderRadius: '16px', 
              fontSize: '11px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0'
            }}
            labelStyle={{ 
              color: '#64748b', 
              marginBottom: '4px', 
              fontWeight: 800, 
              textTransform: 'uppercase', 
              fontSize: '9px', 
              letterSpacing: '0.1em' 
            }}
            itemStyle={{ fontWeight: 900, color: '#0f172a' }}
            cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <defs>
            <linearGradient id="colorReadiness" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Line 
            type="monotone" 
            dataKey="Readiness" 
            stroke="#2563eb" 
            strokeWidth={4} 
            dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} 
            activeDot={{ r: 6, strokeWidth: 0 }} 
          />
        </LineChart>
      ) : null}
    </div>
  )
}
