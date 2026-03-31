import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get emailInput() {
    return this.page.getByLabel(/email/i);
  }

  get passwordInput() {
    return this.page.getByLabel(/password/i);
  }

  get loginButton() {
    return this.page.getByRole('button', { name: 'Log in', exact: true });
  }

  async login(email: string, pass: string) {
    await this.goto('/login');
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.loginButton.click();
    await Promise.race([
      this.page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }),
      this.page.getByText(/invalid login credentials/i).waitFor({ state: 'visible', timeout: 15000 })
    ]);
  }

  async verifyLoginError() {
    await expect(this.page.getByText(/invalid login credentials/i)).toBeVisible();
  }
}
