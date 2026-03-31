export type AppRole = 'athlete' | 'coach' | 'individual'

const ROLE_HOME_ROUTES: Record<AppRole, string> = {
  athlete: '/athlete',
  coach: '/coach',
  individual: '/individual',
}

const ROLE_ONBOARDING_ROUTES: Record<AppRole, string> = {
  athlete: '/athlete/onboarding',
  coach: '/coach/onboarding',
  individual: '/fitstart',
}

export function isAppRole(role: unknown): role is AppRole {
  return role === 'athlete' || role === 'coach' || role === 'individual'
}

export function getRoleHomeRoute(role: AppRole) {
  return ROLE_HOME_ROUTES[role]
}

export function getRoleOnboardingRoute(role: AppRole) {
  return ROLE_ONBOARDING_ROUTES[role]
}
