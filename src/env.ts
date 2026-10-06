/** Vite's BASE_URL, with a Node-safe fallback (tsx scripts import some data modules). */
export const BASE_URL = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
