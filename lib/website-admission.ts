// Server route only. Never expose this URL through NEXT_PUBLIC_* or responses.
import { neon } from "@neondatabase/serverless";
import { reserveAdmission } from "./website-admission-policy.cjs";

type Environment = Record<string, string | undefined>;
const TEST_BRANCH = "feature/v2-svoe-live-telegram-2026-10-16";
const DATABASE_KEY = "SVOYE_HANDOFF_ADMISSION_DATABASE_URL";

function configuredUrl(env: Environment): string | undefined {
  // This adapter is deliberately TEST/Preview-only. Production needs a reviewed
  // binding and policy; changing BOT_READY alone must never bypass admission.
  if (env.SVOYE_HANDOFF_ADMISSION_ENABLED !== "true" ||
      env.VERCEL_ENV !== "preview" || env.VERCEL_GIT_COMMIT_REF !== TEST_BRANCH) return;
  try {
    const value = env[DATABASE_KEY];
    if (!value) return;
    const url = new URL(value);
    if (!["postgres:", "postgresql:"].includes(url.protocol) ||
        !url.hostname.endsWith(".neon.tech") || url.port ||
        decodeURIComponent(url.username) !== "svoe_website_test_runtime" ||
        !url.password || url.pathname !== "/neondb" || url.hash ||
        !["require", "verify-full"].includes(url.searchParams.get("sslmode") || "") ||
        [...url.searchParams.keys()].some(key => !["sslmode", "channel_binding"].includes(key))) return;
    return value;
  } catch { return; }
}

export function isAdmissionConfigured(env: Environment = process.env): boolean {
  return Boolean(configuredUrl(env));
}

export async function reserveWebsiteAdmission() {
  const connectionString = configuredUrl(process.env);
  if (!connectionString) return { allowed: false, httpStatus: 503 };
  // One HTTP query. Both connected-role metadata and the function's TEST fence
  // must match. Unknown timeout can have consumed one unit; never retry/refund.
  return reserveAdmission(async (query: string) => {
    const sql = neon(connectionString, {
      fullResults: true,
      arrayMode: false,
      fetchOptions: {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(5000),
      },
    });
    return sql.query(query);
  });
}
