export function computeAge(birthDate: string, now: Date = new Date()): number {
  const [y, m, d] = birthDate.split('-').map(Number);
  let age = now.getFullYear() - y;
  const month = now.getMonth() + 1;
  if (month < m || (month === m && now.getDate() < d)) age -= 1;
  return age;
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

export function isBirthday(birthDate: string, now: Date = new Date()): boolean {
  const [, m, d] = birthDate.split('-').map(Number);
  return now.getMonth() + 1 === m && now.getDate() === d;
}

/**
 * The age being celebrated this year: the birthday Luna turns (or turned) in the current calendar
 * year. Used for the title and the candle count, so the game says "7th" for the whole run-up to
 * October 16, 2026 and flips to "8th" the next year. Never hardcoded.
 */
export function celebrationAge(birthDate: string, now: Date = new Date()): number {
  const [y] = birthDate.split('-').map(Number);
  return now.getFullYear() - y;
}
