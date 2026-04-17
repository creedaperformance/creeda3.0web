import { randomInt } from 'node:crypto'

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateSixDigitCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export function generateTeamInviteCode(sportCoached: string) {
  const prefix = sportCoached.substring(0, 3).toUpperCase()
  let suffix = ''

  for (let index = 0; index < 6; index += 1) {
    suffix += INVITE_ALPHABET[randomInt(0, INVITE_ALPHABET.length)]
  }

  return `${prefix}-SQD-${suffix}`
}
