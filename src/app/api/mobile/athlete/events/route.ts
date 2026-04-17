import { NextRequest, NextResponse } from 'next/server'

import { authenticateMobileApiRequest, serializeMobileUser } from '@/lib/mobile/auth'
import { handleApiError } from '@/lib/security/http'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await authenticateMobileApiRequest(request)
  if (!auth.ok) return auth.response

  if (auth.user.profile.role !== 'athlete') {
    return NextResponse.json(
      { error: 'Athlete events are only available for athlete accounts.' },
      { status: 403 }
    )
  }

  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase
      .from('platform_events')
      .select('*')
      .order('event_date', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    const events = (Array.isArray(data) ? data : []).map((event) => ({
      id: String(event.id || ''),
      eventName: String(event.event_name || ''),
      eventType: String(event.event_type || ''),
      location: String(event.location || ''),
      eventDate: String(event.event_date || ''),
      skillLevel: String(event.skill_level || ''),
      description: event.description ? String(event.description) : null,
      registrationLink: event.registration_link ? String(event.registration_link) : null,
    }))

    return NextResponse.json({
      success: true,
      user: serializeMobileUser(auth.user),
      events,
    })
  } catch (error) {
    return handleApiError(request, error, {
      logLabel: '[api/mobile/athlete/events] failed',
      publicMessage: 'Failed to load athlete events.',
    })
  }
}
