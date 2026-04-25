import { NextResponse } from 'next/server'

import { findExerciseBySlug } from '@/lib/product/exercises/catalog'
import type { ExerciseLibraryItem } from '@/lib/product/types'

type RouteContext = {
  params: Promise<{
    slug: string
    frame: string
  }>
}

const CATEGORY_COLORS: Record<ExerciseLibraryItem['category'], {
  primary: string
  secondary: string
  accent: string
  surface: string
}> = {
  strength: {
    primary: '#f97316',
    secondary: '#38bdf8',
    accent: '#fbbf24',
    surface: '#111827',
  },
  mobility: {
    primary: '#22c55e',
    secondary: '#38bdf8',
    accent: '#a3e635',
    surface: '#10251d',
  },
  conditioning: {
    primary: '#ef4444',
    secondary: '#f97316',
    accent: '#facc15',
    surface: '#271111',
  },
  recovery: {
    primary: '#14b8a6',
    secondary: '#60a5fa',
    accent: '#99f6e4',
    surface: '#0f2433',
  },
  rehab: {
    primary: '#a78bfa',
    secondary: '#38bdf8',
    accent: '#f0abfc',
    surface: '#1f1837',
  },
  warmup: {
    primary: '#f59e0b',
    secondary: '#22c55e',
    accent: '#fde68a',
    surface: '#241a0a',
  },
  cooldown: {
    primary: '#60a5fa',
    secondary: '#14b8a6',
    accent: '#bfdbfe',
    surface: '#0f1f33',
  },
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function truncate(value: string, max = 72) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 1).trim()}...`
}

function wrapText(value: string, maxLineLength = 42, maxLines = 3) {
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxLineLength && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }

    if (lines.length === maxLines) break
  }

  if (current && lines.length < maxLines) lines.push(current)
  return lines.length ? lines : ['Move with control and keep the full body in frame.']
}

function movementPose(exercise: ExerciseLibraryItem, frame: 'demo' | 'setup') {
  const tags = [
    exercise.movementPattern,
    exercise.subcategory,
    exercise.family,
    ...exercise.trainingIntent,
    ...exercise.movementQualityTags,
  ]
    .join(' ')
    .toLowerCase()

  if (tags.includes('breath')) return 'breathing'
  if (tags.includes('carry')) return 'carry'
  if (tags.includes('jump') || tags.includes('bound') || tags.includes('pogo')) return 'jump'
  if (tags.includes('lunge') || tags.includes('split') || tags.includes('deceleration')) return 'lunge'
  if (tags.includes('hinge') || tags.includes('deadlift') || tags.includes('hamstring')) return 'hinge'
  if (tags.includes('row') || tags.includes('pull')) return 'pull'
  if (tags.includes('press') || tags.includes('shoulder') || tags.includes('overhead')) return 'press'
  if (tags.includes('rotation') || tags.includes('throw') || tags.includes('medball')) return 'rotation'
  if (tags.includes('ankle') || tags.includes('calf')) return 'ankle'
  if (tags.includes('hip') || tags.includes('single_leg') || tags.includes('balance')) return 'balance'
  if (tags.includes('bike') || tags.includes('jog') || tags.includes('run') || tags.includes('sprint')) return 'locomotion'
  if (tags.includes('core') || tags.includes('brace') || tags.includes('plank')) return 'core'
  return frame === 'setup' ? 'setup' : 'squat'
}

function poseSvg(pose: string, colors: (typeof CATEGORY_COLORS)[ExerciseLibraryItem['category']]) {
  const common = {
    head: '<circle cx="548" cy="198" r="36" fill="#f8fafc"/>',
    torso: `<path d="M542 238c-12 55-22 102-29 143" stroke="#f8fafc" stroke-width="34" stroke-linecap="round" fill="none"/>`,
  }

  switch (pose) {
    case 'hinge':
      return `
        <g class="athlete" transform="translate(10 0)">
          ${common.head}
          <path d="M540 240c-50 38-91 84-124 139" stroke="#f8fafc" stroke-width="34" stroke-linecap="round" fill="none"/>
          <path d="M494 287c-58 10-113 2-165-24" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M502 295c54 10 109 5 164-15" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M416 379c-20 74-10 133 30 178" stroke="${colors.accent}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M416 379c74 48 153 82 238 102" stroke="${colors.primary}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M654 481c38 3 69-3 94-19" stroke="${colors.primary}" stroke-width="24" stroke-linecap="round" fill="none"/>
        </g>`
    case 'lunge':
      return `
        <g class="athlete">
          ${common.head}
          ${common.torso}
          <path d="M530 280c-56 22-101 58-136 108" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M552 280c56 18 105 48 147 90" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M513 381c-71 29-119 87-145 174" stroke="${colors.accent}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M513 381c83 22 145 79 186 171" stroke="${colors.primary}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M368 555h95" stroke="${colors.accent}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M699 552h102" stroke="${colors.primary}" stroke-width="24" stroke-linecap="round" fill="none"/>
        </g>`
    case 'press':
      return `
        <g class="athlete">
          ${common.head}
          ${common.torso}
          <path d="M522 252c-52-51-84-99-96-145" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M562 252c47-49 76-99 89-150" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M512 381c-57 54-80 112-69 175" stroke="${colors.accent}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M512 381c59 50 94 107 105 172" stroke="${colors.primary}" stroke-width="30" stroke-linecap="round" fill="none"/>
        </g>`
    case 'pull':
      return `
        <g class="athlete" transform="translate(0 12)">
          ${common.head}
          <path d="M540 238c-25 53-48 99-70 138" stroke="#f8fafc" stroke-width="34" stroke-linecap="round" fill="none"/>
          <path d="M510 277c-66 23-127 25-184 6" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M552 276c66 22 128 23 186 4" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M470 376c-52 50-73 110-63 180" stroke="${colors.accent}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M470 376c65 45 105 105 119 180" stroke="${colors.primary}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M328 282h410" stroke="#64748b" stroke-width="12" stroke-linecap="round"/>
        </g>`
    case 'rotation':
      return `
        <g class="athlete">
          ${common.head}
          <path d="M540 238c-6 52-8 100-5 144" stroke="#f8fafc" stroke-width="34" stroke-linecap="round" fill="none"/>
          <path d="M520 272c-72 4-136-16-191-59" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M556 276c72 14 134 45 185 94" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M535 382c-72 45-111 103-117 174" stroke="${colors.accent}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M535 382c71 45 119 102 145 171" stroke="${colors.primary}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M398 315c98 54 207 58 326 10" stroke="${colors.primary}" stroke-width="10" stroke-linecap="round" fill="none" opacity=".8"/>
        </g>`
    case 'jump':
      return `
        <g class="athlete">
          <animateTransform attributeName="transform" type="translate" values="0 20;0 -8;0 20" dur="2.4s" repeatCount="indefinite"/>
          ${common.head}
          <path d="M542 238c-6 53-14 100-24 142" stroke="#f8fafc" stroke-width="34" stroke-linecap="round" fill="none"/>
          <path d="M520 273c-57 15-112 8-165-20" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M558 274c55 11 107 4 157-22" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M518 380c-62 44-97 96-105 158" stroke="${colors.accent}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M518 380c72 36 122 88 150 156" stroke="${colors.primary}" stroke-width="30" stroke-linecap="round" fill="none"/>
        </g>`
    case 'carry':
      return `
        <g class="athlete">
          ${common.head}
          ${common.torso}
          <path d="M522 274c-56 31-99 68-128 112" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M562 274c55 31 98 68 128 112" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <rect x="352" y="386" width="72" height="72" rx="14" fill="${colors.primary}"/>
          <rect x="660" y="386" width="72" height="72" rx="14" fill="${colors.primary}"/>
          <path d="M512 381c-52 52-75 110-68 175" stroke="${colors.accent}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M512 381c64 48 102 106 113 173" stroke="${colors.primary}" stroke-width="30" stroke-linecap="round" fill="none"/>
        </g>`
    case 'breathing':
      return `
        <g class="athlete" transform="translate(20 80)">
          <circle cx="530" cy="230" r="36" fill="#f8fafc"/>
          <path d="M500 270c-65 31-118 69-160 115" stroke="#f8fafc" stroke-width="32" stroke-linecap="round" fill="none"/>
          <path d="M448 315c-77 3-151 0-221-9" stroke="${colors.accent}" stroke-width="28" stroke-linecap="round" fill="none"/>
          <path d="M456 326c70 18 135 40 195 66" stroke="${colors.primary}" stroke-width="28" stroke-linecap="round" fill="none"/>
          <path d="M330 380c96 35 204 42 323 19" stroke="${colors.secondary}" stroke-width="12" stroke-linecap="round" opacity=".8"/>
          <circle cx="750" cy="235" r="42" fill="none" stroke="${colors.secondary}" stroke-width="8" opacity=".7">
            <animate attributeName="r" values="34;52;34" dur="3.8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values=".35;.85;.35" dur="3.8s" repeatCount="indefinite"/>
          </circle>
        </g>`
    case 'ankle':
      return `
        <g class="athlete">
          ${common.head}
          ${common.torso}
          <path d="M522 274c-52 34-91 78-118 132" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M562 274c53 29 97 70 132 123" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M513 381c-38 62-50 120-37 174" stroke="${colors.accent}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M513 381c83 47 138 103 166 169" stroke="${colors.primary}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M666 552c46-11 77-34 93-69" stroke="${colors.primary}" stroke-width="14" stroke-linecap="round" fill="none"/>
        </g>`
    case 'balance':
      return `
        <g class="athlete">
          <animateTransform attributeName="transform" type="rotate" values="-3 540 360;5 540 360;-3 540 360" dur="3.2s" repeatCount="indefinite"/>
          ${common.head}
          <path d="M540 238c-39 50-63 96-72 139" stroke="#f8fafc" stroke-width="34" stroke-linecap="round" fill="none"/>
          <path d="M512 278c-62 7-118-8-168-45" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M552 278c64 15 122 45 175 90" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M468 377c-8 64 7 123 45 176" stroke="${colors.accent}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M468 377c89-8 177-49 264-121" stroke="${colors.primary}" stroke-width="30" stroke-linecap="round" fill="none"/>
        </g>`
    case 'locomotion':
      return `
        <g class="athlete">
          <animateTransform attributeName="transform" type="translate" values="-12 0;12 0;-12 0" dur="2.6s" repeatCount="indefinite"/>
          ${common.head}
          <path d="M542 238c-4 53-17 100-39 141" stroke="#f8fafc" stroke-width="34" stroke-linecap="round" fill="none"/>
          <path d="M520 274c-61 4-116-14-165-55" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M554 276c57 24 105 59 144 105" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M503 379c-70 36-118 91-143 166" stroke="${colors.accent}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M503 379c87 12 157 56 211 132" stroke="${colors.primary}" stroke-width="30" stroke-linecap="round" fill="none"/>
        </g>`
    case 'core':
      return `
        <g class="athlete" transform="translate(10 95)">
          <circle cx="392" cy="245" r="34" fill="#f8fafc"/>
          <path d="M425 252c94 24 184 54 270 90" stroke="#f8fafc" stroke-width="34" stroke-linecap="round" fill="none"/>
          <path d="M485 274c-57 56-109 88-158 97" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M587 304c67 28 133 27 198-3" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M695 342c47 44 80 94 99 151" stroke="${colors.primary}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M520 286c-8 63 5 121 40 174" stroke="${colors.accent}" stroke-width="30" stroke-linecap="round" fill="none"/>
        </g>`
    default:
      return `
        <g class="athlete">
          ${common.head}
          ${common.torso}
          <path d="M522 274c-57 29-102 69-135 120" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M562 274c55 30 100 70 134 120" stroke="${colors.secondary}" stroke-width="24" stroke-linecap="round" fill="none"/>
          <path d="M513 381c-57 54-80 112-69 175" stroke="${colors.accent}" stroke-width="30" stroke-linecap="round" fill="none"/>
          <path d="M513 381c59 50 94 107 105 172" stroke="${colors.primary}" stroke-width="30" stroke-linecap="round" fill="none"/>
        </g>`
  }
}

function generatedExerciseSvg(exercise: ExerciseLibraryItem, frame: 'demo' | 'setup') {
  const colors = CATEGORY_COLORS[exercise.category]
  const pose = movementPose(exercise, frame)
  const cue = frame === 'setup'
    ? exercise.instructions[0] || exercise.coachingCues[0] || exercise.description
    : exercise.coachingCues[0] || exercise.instructions[0] || exercise.description
  const cueLines = wrapText(cue)
  const tags = [
    titleCase(exercise.category),
    titleCase(exercise.movementPattern),
    titleCase(exercise.equipmentRequired.slice(0, 2).join(' + ') || 'Bodyweight'),
  ]

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(exercise.name)} generated exercise demo</title>
  <desc id="desc">${escapeXml(truncate(exercise.description, 140))}</desc>
  <defs>
    <linearGradient id="surface" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#050816"/>
      <stop offset="1" stop-color="${colors.surface}"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <style>
      .athlete { filter: url(#glow); transform-origin: 540px 360px; }
      .pulse { animation: pulse 2.8s ease-in-out infinite; }
      @keyframes pulse { 0%,100% { opacity: .38; } 50% { opacity: .9; } }
      @media (prefers-reduced-motion: reduce) {
        .athlete, .pulse { animation: none; }
        animate, animateTransform { display: none; }
      }
    </style>
  </defs>
  <rect width="1280" height="720" fill="url(#surface)"/>
  <rect x="0" y="558" width="1280" height="162" fill="#020617" opacity=".72"/>
  <path d="M150 558h980" stroke="#334155" stroke-width="5" stroke-linecap="round"/>
  <text x="70" y="92" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="800">${escapeXml(exercise.name)}</text>
  <text x="70" y="132" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="20">${escapeXml(truncate(exercise.description, 104))}</text>
  ${poseSvg(pose, colors)}
  <g transform="translate(805 130)">
    <rect x="0" y="0" width="385" height="300" rx="26" fill="#0f172a" stroke="#1e293b" stroke-width="2"/>
    <text x="28" y="48" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="800">${frame === 'setup' ? 'Set up cleanly' : 'Demo focus'}</text>
    <path d="M28 72h329" stroke="#1e293b" stroke-width="2"/>
    ${cueLines.map((line, index) => `<text x="32" y="${116 + index * 34}" fill="#cbd5e1" font-family="Inter, Arial, sans-serif" font-size="20">${escapeXml(line)}</text>`).join('\n    ')}
    <g transform="translate(28 224)">
      ${tags.map((tag, index) => `
      <rect x="${index * 112}" y="0" width="102" height="34" rx="17" fill="${index === 0 ? colors.primary : '#111827'}" opacity="${index === 0 ? '.92' : '.82'}"/>
      <text x="${index * 112 + 51}" y="22" fill="${index === 0 ? '#020617' : '#e2e8f0'}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="800">${escapeXml(truncate(tag, 13))}</text>`).join('')}
    </g>
  </g>
  <circle class="pulse" cx="706" cy="374" r="62" fill="none" stroke="${colors.primary}" stroke-width="8"/>
  <text x="70" y="642" fill="#64748b" font-family="Inter, Arial, sans-serif" font-size="16">Generated from Creeda exercise library metadata • ${escapeXml(exercise.slug)}</text>
</svg>`
}

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  const { slug, frame } = await params
  const exercise = findExerciseBySlug(decodeURIComponent(slug))
  const normalizedFrame = frame.replace(/\.svg$/i, '')

  if (!exercise || (normalizedFrame !== 'demo' && normalizedFrame !== 'setup')) {
    return NextResponse.json({ error: 'Exercise media not found.' }, { status: 404 })
  }

  return new NextResponse(
    generatedExerciseSvg(exercise, normalizedFrame),
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': 'image/svg+xml; charset=utf-8',
      },
    }
  )
}
