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
 * the real login screen: with CFS_USERNAME / CFS_PASSWORD, or by hand with
 * npm run auth:<env>, which opens a window and waits for a person to sign in, so
 * no password has to be kept in a file.
 */

/** How long a person gets to sign in in the window. */
const HAND_SIGN_IN_MS = 5 * 60_000;

// A trace of a failed sign-in would hold the password: it records what is typed and posted.
setup.use({ trace: 'off', video: 'off' });

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
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // With no CFS_USERNAME the file can only come from a hand sign-in, so any saved for this address will do.
  const meta = readMeta();
  const sameUser = !env.username || meta?.username === env.username;
  if (fs.existsSync(AUTH_FILE) && meta?.baseUrl === env.baseUrl && sameUser) {
    const saved = await browser.newContext({ storageState: AUTH_FILE, ignoreHTTPSErrors: env.ignoreHttpsErrors });
    try {
      await saved.addCookies([{ name: 'cfs_tab', value: '1', url: env.origin, expires: Math.floor(Date.now() / 1000) + 600, sameSite: 'Lax' }]);
      const response = await saved.request.get(env.appUrl('/api/auth/session'));
      const session = (await response.json().catch(() => ({}))) as { user?: unknown; error?: string };
      if (response.ok() && session.user && !session.error) {
        // Saved again: the call above may have renewed the tokens in the cookie.
        await saved.storageState({ path: AUTH_FILE });
        console.log(`[setup] Reusing the saved CFS session for ${meta.username} on ${env.baseUrl}`);
        return;
      }
      console.log(`[setup] Saved session no longer accepted (${session.error ?? response.status()}) — signing in again`);
    } finally {
      await saved.close();
    }
  }

  await loginPage.goto();
  if (env.handSignIn) {
    setup.setTimeout(HAND_SIGN_IN_MS + 60_000);
    console.log(`\n[setup] Sign in to CFS in the browser window. Waiting up to ${HAND_SIGN_IN_MS / 60_000} minutes…\n`);
    await page.waitForURL((url) => !/\/login\b/.test(url.pathname), { timeout: HAND_SIGN_IN_MS });
  } else {
    const { username, password } = requireCredentials();
    await loginPage.signInAndWait(username, password);
  }
  await topbar.expectVisible();
  await expect(topbar.profileName, 'signed-in user shown in the top bar').toBeVisible();
  const username = env.username || (await topbar.signedInUser());

  await page.context().storageState({ path: AUTH_FILE });
  const newMeta: AuthMeta = { baseUrl: env.baseUrl, username, savedAt: new Date().toISOString() };
  fs.writeFileSync(AUTH_META_FILE, JSON.stringify(newMeta, null, 2));
  console.log(`[setup] Signed in as ${username} on ${env.baseUrl}`);
});
