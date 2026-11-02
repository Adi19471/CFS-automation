import fs from 'fs';
import { test as setup, expect } from '@fixtures';
import { env, requireCredentials } from '@config/env';
import { AUTH_DIR, AUTH_FILE, AUTH_META_FILE } from '@config/paths';

/**
 * Signs in once per run and saves the session to playwright/.auth/<env>.json;
 * every signed-in project starts from that file instead of the login screen.
 *
 * The file from an earlier run is reused when it was saved for the same
 * address and user and the app still accepts it (a call to /api/auth/session,
 * which also renews the access token). Otherwise the setup signs in through
 * the real login screen.
 */

interface AuthMeta {
  baseUrl: string;
  username: string;
  savedAt: string;
}

function readMeta(): AuthMeta | null {
  try {
    return JSON.parse(fs.readFileSync(AUTH_META_FILE, 'utf8')) as AuthMeta;
  } catch {
    return null;
  }
}

setup('sign in to CFS and save the session', async ({ page, loginPage, browser, topbar }) => {
  const { username, password } = requireCredentials();
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const meta = readMeta();
  if (fs.existsSync(AUTH_FILE) && meta?.baseUrl === env.baseUrl && meta.username === username) {
    const saved = await browser.newContext({ storageState: AUTH_FILE, ignoreHTTPSErrors: env.ignoreHttpsErrors });
    try {
      await saved.addCookies([{ name: 'cfs_tab', value: '1', url: env.origin, expires: Math.floor(Date.now() / 1000) + 600, sameSite: 'Lax' }]);
      const response = await saved.request.get(env.appUrl('/api/auth/session'));
      const session = (await response.json().catch(() => ({}))) as { user?: unknown; error?: string };
      if (response.ok() && session.user && !session.error) {
        // Saved again: the call above may have renewed the tokens in the cookie.
        await saved.storageState({ path: AUTH_FILE });
        console.log(`[setup] Reusing the saved CFS session for ${username} on ${env.baseUrl}`);
        return;
      }
      console.log(`[setup] Saved session no longer accepted (${session.error ?? response.status()}) — signing in again`);
    } finally {
      await saved.close();
    }
  }

  await loginPage.goto();
  await loginPage.signInAndWait(username, password);
  await topbar.expectVisible();
  await expect(topbar.profileName, 'signed-in user shown in the top bar').toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });
  const newMeta: AuthMeta = { baseUrl: env.baseUrl, username, savedAt: new Date().toISOString() };
  fs.writeFileSync(AUTH_META_FILE, JSON.stringify(newMeta, null, 2));
  console.log(`[setup] Signed in as ${username} on ${env.baseUrl}`);
});
