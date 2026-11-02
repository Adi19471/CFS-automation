import { test, expect } from '@fixtures';
import { INVALID_LOGINS, LOGIN_MESSAGES } from '@data/testdata/login.data';
import { TAG } from '@utils/tags';

/**
 * The sign-in screen, signed out. Nothing here signs in for real: the only
 * credentials sent are made up and must be refused.
 */
test.describe('Login screen', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('shows the sign-in form', { tag: [TAG.public, TAG.smoke] }, async ({ loginPage }) => {
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.subtitle).toBeVisible();
    await expect(loginPage.usernameInput).toHaveAttribute('placeholder', 'Enter your username');
    await expect(loginPage.passwordInput).toHaveAttribute('placeholder', 'Enter your password');
    await expect(loginPage.signInButton).toHaveText(/Sign In/);
    await expect(loginPage.helpText).toBeVisible();
    await expect(loginPage.companyLogo).toBeVisible();
  });

  test('brand panel shows the six-step CFS flow', { tag: [TAG.public, TAG.regression] }, async ({ loginPage }) => {
    await expect(loginPage.brandPanel).toBeVisible();
    await expect(loginPage.brandHeadline).toHaveText('One flow, from gate in to gate out.');
    expect(await loginPage.flowStepLabels()).toEqual(['Gate In', 'Yard', 'Customs', 'Operations', 'Marine', 'Gate Out']);
  });

  test('focuses the username box on load', { tag: [TAG.public, TAG.regression] }, async ({ loginPage }) => {
    await expect(loginPage.usernameInput).toBeFocused();
  });

  test('masks the password and shows it on request', { tag: [TAG.public, TAG.regression] }, async ({ loginPage }) => {
    await loginPage.passwordInput.fill('not-a-real-password');
    expect(await loginPage.isPasswordMasked()).toBe(true);
    await loginPage.togglePasswordVisibility();
    expect(await loginPage.isPasswordMasked()).toBe(false);
    await loginPage.togglePasswordVisibility();
    expect(await loginPage.isPasswordMasked()).toBe(true);
  });

  test('refuses an empty username', { tag: [TAG.public, TAG.regression] }, async ({ loginPage, page }) => {
    await loginPage.passwordInput.fill('anything');
    await loginPage.submit();
    await loginPage.toast.expectShown({ severity: 'error', ...LOGIN_MESSAGES.usernameRequired });
    await expect(page).toHaveURL(/\/login/);
  });

  test('refuses an empty password', { tag: [TAG.public, TAG.regression] }, async ({ loginPage, page }) => {
    await loginPage.usernameInput.fill('someone');
    await loginPage.submit();
    await loginPage.toast.expectShown({ severity: 'error', ...LOGIN_MESSAGES.passwordRequired });
    await expect(page).toHaveURL(/\/login/);
  });

  test('a blank username of spaces counts as empty', { tag: [TAG.public, TAG.regression] }, async ({ loginPage }) => {
    await loginPage.fillCredentials('   ', 'anything');
    await loginPage.submit();
    await loginPage.toast.expectShown({ severity: 'error', summary: LOGIN_MESSAGES.usernameRequired.summary });
  });

  for (const login of INVALID_LOGINS) {
    test(`refuses a wrong sign-in (${login.case})`, { tag: [TAG.public, TAG.regression] }, async ({ loginPage, page }) => {
      // Made-up account: the backend must answer "no".
      await loginPage.signIn(login.username(), login.password);
      await loginPage.toast.expectShown({ severity: 'error', summary: new RegExp(`${LOGIN_MESSAGES.wrongCredentials.summary}|Error`), timeout: 30_000 });
      await expect(page).toHaveURL(/\/login/);
      await expect(loginPage.signInButton).toBeEnabled();
    });
  }

  test('Enter in the password box submits the form', { tag: [TAG.public, TAG.regression] }, async ({ loginPage }) => {
    await loginPage.usernameInput.fill('someone');
    await loginPage.passwordInput.press('Enter');
    await loginPage.toast.expectShown({ severity: 'error', summary: LOGIN_MESSAGES.passwordRequired.summary });
  });
});

test.describe('Login screen notices', () => {
  test('says why after an idle sign-out', { tag: [TAG.public, TAG.regression] }, async ({ loginPage }) => {
    await loginPage.goto({ reason: 'timeout' });
    await loginPage.toast.expectShown({ severity: 'warn', ...LOGIN_MESSAGES.idleSignOut });
  });
});
