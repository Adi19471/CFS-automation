/**
 * The CFS environments the suite can run against, with their defaults.
 *
 * Only addresses and safety rules live here (they are not secrets, so they are
 * committed). The sign-in comes from .env.<name> or the CI environment — see
 * env.ts. BASE_URL in either of those overrides the address below.
 */

export const ENVIRONMENTS = ['local', 'dev', 'uat', 'production'] as const;
export type EnvName = (typeof ENVIRONMENTS)[number];

export interface EnvironmentDefaults {
  /** App address including the /CFS base path, no trailing slash. */
  baseUrl: string;
  description: string;
  /**
   * true = tests that create or change records never run here, whatever
   * ALLOW_WRITES says.
   */
  alwaysReadOnly: boolean;
}

export const ENVIRONMENT_DEFAULTS: Record<EnvName, EnvironmentDefaults> = {
  local: {
    baseUrl: 'http://localhost:3000/CFS',
    description: 'CFS dev server on this machine',
    alwaysReadOnly: false,
  },
  dev: {
    baseUrl: 'http://app.infyz.corp/CFS',
    description: 'Shared dev deployment (office network)',
    alwaysReadOnly: false,
  },
  uat: {
    baseUrl: 'https://cfsuat.containeroncloud.com/CFS',
    description: 'User acceptance testing',
    alwaysReadOnly: false,
  },
  production: {
    baseUrl: 'https://vplpl.containeroncloud.com/CFS',
    description: 'Production — read-only checks only',
    alwaysReadOnly: true,
  },
};
