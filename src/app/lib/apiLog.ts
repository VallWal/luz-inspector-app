// ---- Lightweight API observability -------------------------------------------------
// Counts every webhook interaction (the app never talks to Airtable directly —
// n8n does). Console output only in development; counters always maintained so
// they can be inspected via getApiCounters() from the console.

export type ApiEvent =
  | "request" // network request actually sent
  | "cache-hit" // served from local cache, zero network
  | "stale-hit" // network failed, stale cache served
  | "dedupe" // joined an already in-flight request
  | "error";

const counters: Record<ApiEvent, number> = {
  request: 0,
  "cache-hit": 0,
  "stale-hit": 0,
  dedupe: 0,
  error: 0,
};

export function logApi(event: ApiEvent, source: string, detail?: string) {
  counters[event] += 1;
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[api] ${new Date().toISOString()} ${event.padEnd(9)} ${source}` +
        (detail ? ` — ${detail}` : ""),
      { ...counters }
    );
  }
}

/** Dev helper: current counters (also callable from the browser console). */
export function getApiCounters() {
  return { ...counters };
}

declare global {
  interface Window {
    luzApiCounters?: () => Record<ApiEvent, number>;
  }
}
if (typeof window !== "undefined") {
  window.luzApiCounters = getApiCounters;
}
