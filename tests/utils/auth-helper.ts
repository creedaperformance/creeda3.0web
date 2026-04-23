import { Page } from '@playwright/test';
import { acceptRequiredSignupConsents } from './current-flows';

export async function signupAthlete(page: Page) {
  const testEmail = `testathlete_${Date.now()}@example.com`;
  await page.goto('/signup');
  
  const athleteBtn = page.getByRole('button', { name: /I am an Athlete/i });
  await athleteBtn.waitFor();
  await athleteBtn.click();

  await page.getByLabel(/Full Name/i).fill('Test Athlete E2E');
  await page.getByLabel(/Email Address/i).fill(testEmail);
  await page.getByLabel(/Password/i).fill('TestPass123!');
  await acceptRequiredSignupConsents(page);
  
  await page.getByRole('button', { name: /Complete Signup/i }).click();
  
  await page.waitForURL(/\/(athlete\/onboarding|verify-email|athlete\/dashboard)/);
}

export async function signupCoach(page: Page) {
  const testEmail = `testcoach_${Date.now()}@example.com`;
  await page.goto('/signup');
  
  await page.getByRole('button', { name: /I am a Coach/i }).click();

  await page.getByLabel(/Full Name/i).fill('Test Coach E2E');
  await page.getByLabel(/Email Address/i).fill(testEmail);
  await page.getByLabel(/Password/i).fill('TestPass123!');
  await acceptRequiredSignupConsents(page);
  
  await page.getByRole('button', { name: /Complete Signup/i }).click();
  
  await page.waitForURL(/\/(coach\/dashboard|coach\/onboarding|verify-email)/);
}
