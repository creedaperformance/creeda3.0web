import 'server-only'

import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __creedaResearchPrisma__: PrismaClient | undefined
}

export function getResearchPrismaClient() {
  if (!global.__creedaResearchPrisma__) {
    global.__creedaResearchPrisma__ = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  }

  return global.__creedaResearchPrisma__
}
