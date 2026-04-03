import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export const STORAGE_STATE_ATHLETE = path.join(__dirname, '.auth/athlete.json');
export const STORAGE_STATE_COACH = path.join(__dirname, '.auth/coach.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Set to false to avoid database/auth collisions during setup
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for local stability
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Setup project
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium-public',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/athlete-dashboard.spec.ts/, /coach-dashboard.spec.ts/, /injury-system.spec.ts/, /coach-intelligence.spec.ts/],
    },
    {
      name: 'athlete-flow',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE_ATHLETE,
      },
      dependencies: ['setup'],
      testMatch: [/athlete-dashboard.spec.ts/, /injury-system.spec.ts/],
    },
    {
      name: 'coach-flow',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE_COACH,
      },
      dependencies: ['setup'],
      testMatch: [/coach-dashboard.spec.ts/, /coach-intelligence.spec.ts/],
    },
  ],

  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
