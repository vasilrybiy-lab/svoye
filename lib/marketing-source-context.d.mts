export type SourceContext = { version: 1; publicCode: string };
export function sourceContext(value: unknown): SourceContext | null;
export function campaignCodeFromSiteUrl(href: string): string | null;
export function optionalSourceBody(base: Record<string, unknown>, value: unknown, options?: { authorized?: boolean }): { ok: boolean; body?: string; sourceAttached?: boolean; error?: string };
