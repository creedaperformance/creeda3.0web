import 'server-only'

import IORedis from 'ioredis'
import { Queue, Worker, type JobsOptions } from 'bullmq'

import { getResearchEnv, RESEARCH_QUEUE_NAMES } from '@/lib/research/config'
import type { QueueJobResult } from '@/lib/research/types'

type ResearchQueueName = (typeof RESEARCH_QUEUE_NAMES)[keyof typeof RESEARCH_QUEUE_NAMES]

let redisConnection: IORedis | null = null

function getRedisConnection() {
  const env = getResearchEnv()
  if (!env.RESEARCH_REDIS_URL) {
    throw new Error('RESEARCH_REDIS_URL is required to use BullMQ research queues.')
  }

  if (!redisConnection) {
    redisConnection = new IORedis(env.RESEARCH_REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  }

  return redisConnection
}

export function getResearchQueue(name: ResearchQueueName) {
  return new Queue(name, {
    connection: getRedisConnection(),
  })
}

export async function enqueueResearchJob<T extends Record<string, unknown>>(
  queueName: ResearchQueueName,
  jobName: string,
  payload: T,
  options?: JobsOptions
) {
  const queue = getResearchQueue(queueName)
  return queue.add(jobName, payload, {
    attempts: 3,
    removeOnComplete: 100,
    removeOnFail: 100,
    ...options,
  })
}

export function registerResearchWorker<T extends Record<string, unknown>>(
  queueName: ResearchQueueName,
  processor: (payload: T) => Promise<QueueJobResult>
) {
  return new Worker(
    queueName,
    async (job) => processor(job.data as T),
    {
      connection: getRedisConnection(),
      concurrency: 1,
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  )
}
