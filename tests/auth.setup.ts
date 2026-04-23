import { test as setup } from '@playwright/test';
import { promises as fs } from 'fs';
import * as path from 'path';
import { acceptRequiredSignupConsents } from './utils/current-flows';

const athleteFile = path.resolve(__dirname, '../.auth/athlete.json');
const coachFile = path.resolve(__dirname, '../.auth/coach.json');

setup('setup athlete account', async ({ page }) => {
  const testEmail = `testathlete_${Date.now()}@example.com`;
  await page.goto('/signup');
  
  await page.getByRole('button', { name: /Athlete Performance system/i }).click();
  
  await page.getByLabel(/Full Name/i).fill('Test Athlete E2E');
  await page.getByLabel(/Email Connection/i).fill(testEmail);
  await page.getByLabel(/Security Access/i).fill('TestPass123!');
  await acceptRequiredSignupConsents(page);
  await page.getByRole('button', { name: /Continue to Athlete Onboarding/i }).click();
  
  await page.waitForURL(/\/(athlete\/onboarding|verify-email|athlete\/dashboard)/, { timeout: 30000 });
  await fs.rm(athleteFile, { force: true });
  await page.context().storageState({ path: athleteFile });
});

setup('setup coach account', async ({ page }) => {
  const testEmail = `testcoach_${Date.now()}@example.com`;
  await page.goto('/signup');
  
  await page.getByRole('button', { name: /Coach Squad intelligence/i }).click();
  
  await page.getByLabel(/Full Name/i).fill('Test Coach E2E');
  await page.getByLabel(/Email Connection/i).fill(testEmail);
  await page.getByLabel(/Security Access/i).fill('TestPass123!');
  await acceptRequiredSignupConsents(page);
  await page.getByRole('button', { name: /Create Coach Account/i }).click();

  await page.waitForURL(/\/(coach\/dashboard|coach\/onboarding|verify-email)/, { timeout: 30000 });
  await fs.rm(coachFile, { force: true });
  await page.context().storageState({ path: coachFile });
});
