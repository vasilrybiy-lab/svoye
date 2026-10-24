// Server-only entry for the finite, invited full-journey test. Public intake stays closed.
import { timingSafeEqual } from "node:crypto";

export const PILOT_COOKIE = "__Host-svoe-journey-pilot";
export const PILOT_UNTIL = "2026-10-24T19:00:00.000Z";
const PILOT_FROM = Date.parse("2026-10-24T13:45:00.000Z");
type Env = Record<string, string | undefined>;
type PilotRequest = {
  nextUrl?: { protocol?: string; hostname?: string; port?: string; searchParams?: { getAll(name: string): string[] } };
  cookies?: { get(name: string): { value: string } | undefined };
  headers?: { get(name: string): string | null | undefined };
};

function matches(value: unknown, env: Env): boolean {
  const expected = env.SVOYE_HANDOFF_PILOT_ACCESS;
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value) &&
    typeof expected === "string" && /^[a-f0-9]{64}$/.test(expected) &&
    timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
function scope(request: PilotRequest | undefined, env: Env, now: number): boolean {
  return Number.isFinite(now) && now >= PILOT_FROM && now < Date.parse(PILOT_UNTIL) &&
    env.VERCEL_ENV === "preview" &&
    env.VERCEL_GIT_COMMIT_REF === "feature/v2-svoe-live-telegram-2026-10-16" &&
    env.SVOYE_HANDOFF_BOT_READY !== "true" && env.SVOYE_HANDOFF_DIRECT_NEON_ENABLED === "true" &&
    request?.nextUrl?.protocol === "https:" && request.nextUrl.hostname === "svoe.live" && !request.nextUrl.port;
}
export function isPilotEntry(request: PilotRequest | undefined, env: Env = process.env, now = Date.now()): boolean {
  const values = request?.nextUrl?.searchParams?.getAll("pilot") || [];
  return scope(request, env, now) && values.length === 1 && matches(values[0], env);
}
export function isPilotSession(request: PilotRequest | undefined, env: Env = process.env, now = Date.now()): boolean {
  const explicitAccess = request?.headers?.get("x-svoe-pilot-access");
  return scope(request, env, now) && matches(explicitAccess ?? request?.cookies?.get(PILOT_COOKIE)?.value, env);
}
