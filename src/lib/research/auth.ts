import 'server-only'

import { timingSafeEqual } from 'node:crypto'

import { getResearchEnv } from '@/lib/research/config'

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

export function authorizeResearchAdminRequest(request: Request) {
  const token = getResearchEnv().RESEARCH_INTERNAL_API_TOKEN
  if (!token) {
    throw new Error('RESEARCH_INTERNAL_API_TOKEN is required for internal research routes.')
  }

  const header = request.headers.get('authorization') || request.headers.get('x-research-admin-token') || ''
  const presented = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : header.trim()

  return Boolean(presented) && safeEqual(token, presented)
}
