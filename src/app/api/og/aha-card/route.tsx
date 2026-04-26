import { ImageResponse } from 'next/og'

import { getSiteUrl } from '@/lib/env'

export const runtime = 'edge'

const CARD_WIDTH = 1080
const CARD_HEIGHT = 1920

const SEVERITY_TONE: Record<string, { primary: string; soft: string; label: string }> = {
  severe: { primary: '#FB7185', soft: 'rgba(251,113,133,0.16)', label: 'Severe' },
  moderate: { primary: '#FCD34D', soft: 'rgba(252,211,77,0.16)', label: 'Moderate' },
  mild: { primary: '#A7F3D0', soft: 'rgba(167,243,208,0.16)', label: 'Mild' },
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const finding = (url.searchParams.get('finding') ?? 'We found something to watch.').slice(0, 220)
  const region = (url.searchParams.get('region') ?? 'movement').replace(/_/g, ' ').slice(0, 40)
  const sport = (url.searchParams.get('sport') ?? '').slice(0, 32)
  const severityRaw = (url.searchParams.get('severity') ?? 'moderate').toLowerCase()
  const severity = SEVERITY_TONE[severityRaw] ? severityRaw : 'moderate'
  const score = clamp(Number(url.searchParams.get('score') ?? 70), 0, 100)
  const handle = (url.searchParams.get('handle') ?? '').slice(0, 28)

  const tone = SEVERITY_TONE[severity]
  const siteUrl = getSiteUrl()
  const siteHost = siteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'radial-gradient(circle at 25% 12%, rgba(110,231,183,0.18), transparent 38%), radial-gradient(circle at 80% 90%, rgba(56,189,248,0.18), transparent 35%), linear-gradient(180deg, #02060c 0%, #0a1220 100%)',
          color: 'white',
          padding: '88px 72px',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          position: 'relative',
        }}
      >
        {/* ── Top brand strip ────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 18,
              background: 'rgba(110,231,183,0.16)',
              color: '#6EE7B7',
              fontWeight: 900,
              fontSize: 36,
              letterSpacing: -2,
            }}
          >
            ▲
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 6,
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              CREEDA
            </span>
            <span
              style={{
                fontSize: 15,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              AI Sports Scientist
            </span>
          </div>
        </div>

        {/* ── Headline label ─────────────────────────────────────────── */}
        <div style={{ marginTop: 110, display: 'flex' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 22px',
              border: `2px solid ${tone.primary}`,
              borderRadius: 999,
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: tone.primary,
              background: tone.soft,
            }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: tone.primary,
              }}
            />
            We found something
          </div>
        </div>

        {/* ── Finding ────────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: 64,
            fontSize: finding.length > 110 ? 78 : 96,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -2.5,
            color: 'white',
            textWrap: 'balance' as never,
            display: 'flex',
          }}
        >
          {finding}
        </div>

        {/* ── Sport + region row ─────────────────────────────────────── */}
        <div style={{ marginTop: 56, display: 'flex', alignItems: 'center', gap: 32 }}>
          <Pill tone={tone.primary} bg={tone.soft} label={tone.label} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 26,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.66)',
              textTransform: 'capitalize',
            }}
          >
            {region}
          </div>
          {sport ? (
            <>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.2)',
                }}
              />
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.66)',
                  textTransform: 'capitalize',
                }}
              >
                {sport}
              </div>
            </>
          ) : null}
        </div>

        {/* ── Movement quality score ─────────────────────────────────── */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <span
            style={{
              fontSize: 22,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.4)',
              fontWeight: 800,
            }}
          >
            Movement quality
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24 }}>
            <span
              style={{
                fontSize: 220,
                fontWeight: 900,
                letterSpacing: -10,
                lineHeight: 0.9,
                color: 'white',
              }}
            >
              {score}
            </span>
            <span
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              /100
            </span>
          </div>

          {/* progress rail */}
          <div
            style={{
              marginTop: 24,
              width: '100%',
              height: 12,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.08)',
              display: 'flex',
            }}
          >
            <div
              style={{
                width: `${score}%`,
                height: 12,
                borderRadius: 999,
                background: tone.primary,
              }}
            />
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: 'white',
              }}
            >
              {handle ? `@${handle}` : 'Anonymous athlete'}
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              {siteHost}
            </span>
          </div>
          <span
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: '#6EE7B7',
            }}
          >
            Run your scan →
          </span>
        </div>
      </div>
    ),
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    }
  )
}

function Pill({ tone, bg, label }: { tone: string; bg: string; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 18px',
        borderRadius: 999,
        background: bg,
        border: `2px solid ${tone}`,
        color: tone,
        fontSize: 22,
        fontWeight: 900,
        letterSpacing: 4,
        textTransform: 'uppercase',
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 999, background: tone }} />
      {label}
    </div>
  )
}
