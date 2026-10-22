// Client-safe invite handling. This is an entry capability, never a provider credential.
// Keep it in page memory; fragments are not sent as request URLs or referrers.
export function readPilotAccess(fragment: string): string | undefined {
  return /^#svoe-pilot=([a-f0-9]{64})$/.exec(fragment)?.[1];
}
export function pilotHeaders(access: string | undefined): Record<string, string> {
  return access && /^[a-f0-9]{64}$/.test(access) ? { "X-Svoe-Pilot-Access": access } : {};
}


type ReadinessOptions = {
  readFragment: () => string;
  fetchStatus: (headers: Record<string, string>) => Promise<boolean>;
  onAccess: (access: string | undefined) => void;
  onReady: (ready: boolean) => void;
  onChecking: (checking: boolean) => void;
};
// Recheck on explicit lifecycle events; never poll or send a trial summary here.
export function createHandoffReadiness(options: ReadinessOptions) {
  let live = true, revision = 0;
  let access: string | undefined;
  return {
    async check() {
      if (!live) return;
      const found = readPilotAccess(options.readFragment());
      if (found) access = found;
      options.onAccess(access);
      const ownRevision = ++revision;
      options.onChecking(true);
      try {
        const ready = await options.fetchStatus(pilotHeaders(access));
        if (live && ownRevision === revision) options.onReady(ready === true);
      } catch {
        if (live && ownRevision === revision) options.onReady(false);
      } finally {
        if (live && ownRevision === revision) options.onChecking(false);
      }
    },
    stop() { live = false; revision++; },
  };
}
