// Client-safe invite handling. This is an entry capability, never a provider credential.
// Keep it in page memory; fragments are not sent as request URLs or referrers.
export function readPilotAccess(fragment: string): string | undefined {
  return /^#svoe-pilot=([a-f0-9]{64})$/.exec(fragment)?.[1];
}
export function pilotHeaders(access: string | undefined): Record<string, string> {
  return access && /^[a-f0-9]{64}$/.test(access) ? { "X-Svoe-Pilot-Access": access } : {};
}
