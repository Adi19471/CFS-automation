import { expect, type Locator, type Page } from '@playwright/test';
import { env } from '@config/env';
import { Toast } from '@components/Toast';

/**
 * Sign-in screen, /CFS/login (app/(full-page)/login/page.tsx).
 *
 * Left: the brand panel ("About CFS") with the six-step CFS flow.
 * Right: Username (#username), Password (#password, PrimeReact Password with a
 * show/hide toggle), "Sign In". Empty fields are refused with a toast before
 * anything is sent; a wrong sign-in shows "Wrong username or password".
 * After sign-in the app goes to ?callbackUrl or the dashboard.
 */
export class LoginPage {
  readonly path = '/login';

  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly passwordToggle: Locator;
  readonly signInButton: Locator;
  readonly helpText: Locator;
  readonly companyLogo: Locator;

  readonly brandPanel: Locator;
  readonly brandHeadline: Locator;
  readonly flowSteps: Locator;

  readonly toast: Toast;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: 'Sign in', level: 1 });
    this.subtitle = page.getByText('Use your CFS account to continue.');
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.passwordToggle = page.locator('.p-password').locator('.p-password-show-icon, .p-password-hide-icon').first();
    this.signInButton = page.getByRole('button', { name: /Sign In|Signing in/ });
    this.helpText = page.getByText('Trouble signing in? Contact your system administrator.');
    this.companyLogo = page.getByRole('img', { name: 'Company logo' });

    this.brandPanel = page.getByRole('complementary', { name: 'About CFS' });
    this.brandHeadline = this.brandPanel.getByRole('heading', { level: 2 });
    this.flowSteps = this.brandPanel.getByRole('region', { name: 'How a container moves through the station' }).locator('li');

    this.toast = new Toast(page);
  }

  /** Opens /login, optionally with a ?callbackUrl= or ?reason=. */
  async goto(query: Record<string, string> = {}): Promise<void> {
    const qs = new URLSearchParams(query).toString();
    await this.page.goto(env.appUrl(`${this.path}${qs ? `?${qs}` : ''}`));
    await this.expectVisible();
  }

  async expectVisible(): Promise<void> {
    await expect(this.heading, 'sign-in heading').toBeVisible();
    await expect(this.usernameInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.signInButton).toBeEnabled();
  }

  async fillCredentials(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.signInButton.click();
  }

  /** Fills in and submits the form; does not wait for the outcome. */
  async signIn(username: string, password: string): Promise<void> {
    await this.fillCredentials(username, password);
    await this.submit();
  }

  /**
   * Signs in and waits until the app has left /login. Throws with the toast's
   * text when the sign-in is refused, instead of running into the timeout.
   */
  async signInAndWait(username: string, password: string, timeout = env.timeouts.navigation): Promise<void> {
    await this.signIn(username, password);
    const left = this.page
      .waitForURL((url) => env.routeOf(url.toString()) !== this.path, { timeout })
      .then(() => 'left' as const)
      .catch(() => 'timeout' as const);
    const refused = this.toast
      .ofSeverity('error')
      .first()
      .waitFor({ state: 'visible', timeout })
      .then(() => 'refused' as const)
      .catch(() => 'timeout' as const);
    const outcome = await Promise.race([left, refused]);
    if (outcome === 'refused') {
      throw new Error(`Sign-in refused for "${username}": ${(await this.toast.visibleTexts()).join(' | ')}`);
    }
    if (outcome === 'timeout') throw new Error(`Sign-in did not leave /login within ${timeout} ms`);
  }

  async flowStepLabels(): Promise<string[]> {
    const labels = await this.flowSteps.locator('span:nth-child(2)').allTextContents();
    return labels.map((l) => l.trim());
  }

  async isPasswordMasked(): Promise<boolean> {
    return (await this.passwordInput.getAttribute('type')) === 'password';
  }

  async togglePasswordVisibility(): Promise<void> {
    await this.passwordToggle.click();
  }
}
