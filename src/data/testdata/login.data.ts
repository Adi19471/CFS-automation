/**
 * Sign-in data for the negative login tests. These accounts do not exist; the
 * real sign-in comes from CFS_USERNAME / CFS_PASSWORD (src/config/env.ts).
 */
export const INVALID_LOGINS = [
  { case: 'unknown user', username: () => `pw-no-such-user-${Date.now()}`, password: 'Wrong-Password-1!' },
] as const;

export const LOGIN_MESSAGES = {
  usernameRequired: { summary: 'Username is required', detail: 'Enter username' },
  passwordRequired: { summary: 'Password is required', detail: 'Enter password' },
  wrongCredentials: { summary: 'Wrong username or password' },
  idleSignOut: { summary: 'Signed out', detail: /inactivity/ },
} as const;
