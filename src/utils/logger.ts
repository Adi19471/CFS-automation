/**
 * Console logging for the suite. Output goes to the terminal and, inside a test,
 * into that test's stdout in the Playwright, Allure and CFS reports.
 * LOG_LEVEL=debug | info | warn | error (default info).
 */

const LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type Level = (typeof LEVELS)[number];

const threshold = LEVELS.indexOf((process.env.LOG_LEVEL as Level) || 'info');

function write(level: Level, scope: string, message: string): void {
  if (LEVELS.indexOf(level) < (threshold < 0 ? 1 : threshold)) return;
  const time = new Date().toISOString().slice(11, 19);
  const line = `${time} ${level.toUpperCase().padEnd(5)} [${scope}] ${message}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function createLogger(scope: string) {
  return {
    debug: (message: string) => write('debug', scope, message),
    info: (message: string) => write('info', scope, message),
    warn: (message: string) => write('warn', scope, message),
    error: (message: string) => write('error', scope, message),
  };
}

export type Logger = ReturnType<typeof createLogger>;
