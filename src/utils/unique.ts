/**
 * Values that are unique per run, for records a @write test creates. Each one
 * starts with PW so test data is easy to find and remove on the server.
 */

const RUN_ID = Date.now().toString(36).toUpperCase().slice(-6);
let counter = 0;

/** e.g. PW1A2B3C01 — upper case, letters and digits only */
export function uniqueCode(prefix = 'PW', length = 10): string {
  counter += 1;
  return `${prefix}${RUN_ID}${String(counter).padStart(2, '0')}`.slice(0, length).toUpperCase();
}

/** e.g. "PW Customer 1A2B3C01" */
export function uniqueName(noun: string): string {
  return `PW ${noun} ${uniqueCode('', 8)}`;
}

/** 10-digit Indian mobile number starting with 9 */
export function uniqueMobile(): string {
  const tail = String(Date.now() + counter++).slice(-9);
  return `9${tail}`;
}

export function uniqueEmail(local = 'pw.cfs'): string {
  return `${local}.${uniqueCode('', 8).toLowerCase()}@example.com`;
}

/**
 * A GSTIN in the 15-character format: 2-digit state, 10-character PAN
 * (5 letters, 4 digits, 1 letter), entity digit, "Z", check character.
 */
export function uniqueGstin(stateCode = '36'): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const seed = Date.now() + counter++;
  const pick = (n: number) => letters[Math.floor(seed / 26 ** n) % 26];
  const pan = `${pick(0)}${pick(1)}${pick(2)}P${pick(3)}${String(seed % 10_000).padStart(4, '0')}${pick(4)}`;
  return `${stateCode}${pan}1Z${seed % 10}`;
}
