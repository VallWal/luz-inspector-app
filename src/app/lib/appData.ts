// ---- App data from Airtable (via n8n) --------------------------------------------
// The app never talks to Airtable directly. ONE bootstrap call loads
// everything the inspection flow needs; n8n resolves it into 5 Airtable
// reads. To keep the Airtable quota sane this module owns the access policy:
//
//   1. In-flight dedupe — concurrent calls (React Strict Mode double-mount,
//      re-renders) share one request.
//   2. localStorage cache — within FRESH_MS the app opens with ZERO network
//      calls; after that, one revalidation request.
//   3. Stale fallback — if the network fails, the last known data is served
//      (any age) so the inspector can keep working offline.
//
// Category navigation, finding creation and screen re-renders read only from
// state seeded here — they never trigger requests.

import type {
  InspectionItem,
  OpenFinding,
  Property,
  PropertyNote,
} from "../data";
import { logApi } from "./apiLog";

/** Production webhook of "Luz - App Get Properties - CLAUDE" (must be active). */
export const N8N_APP_DATA_URL =
  "https://automation.vallendiz.com/webhook/luz-app-properties";

export interface AppData {
  properties: Property[];
  notes: PropertyNote[];
  /** Full Inspection Items table — the source of truth for the flow. */
  inspectionItems: InspectionItem[];
  /** Findings with Status != Resolved, across all properties. */
  openFindings: OpenFinding[];
}

const CACHE_KEY = "luz-app-data-v1";
/** Serve straight from cache within this window (no network at all). */
const FRESH_MS = 15 * 60 * 1000;

interface CacheEntry {
  at: number;
  data: AppData;
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || typeof parsed.at !== "number" || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: AppData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // Quota/private mode — caching is best-effort.
  }
}

function shape(data: Record<string, unknown>): AppData {
  return {
    properties: Array.isArray(data.properties)
      ? (data.properties as Property[])
      : [],
    notes: Array.isArray(data.notes) ? (data.notes as PropertyNote[]) : [],
    inspectionItems: Array.isArray(data.inspectionItems)
      ? (data.inspectionItems as InspectionItem[])
      : [],
    openFindings: Array.isArray(data.openFindings)
      ? (data.openFindings as OpenFinding[])
      : [],
  };
}

/** Remove a resolved finding from the cached payload so a reload within the
 * fresh-window doesn't resurrect it. Best-effort. */
export function removeOpenFindingFromCache(recordId: string) {
  try {
    const cached = readCache();
    if (!cached) return;
    cached.data.openFindings = cached.data.openFindings.filter(
      (f) => f.recordId !== recordId
    );
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch {
    // best-effort
  }
}

let inFlight: Promise<AppData> | null = null;

async function requestAppData(): Promise<AppData> {
  logApi("request", "appData", N8N_APP_DATA_URL);
  const res = await fetch(N8N_APP_DATA_URL, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`App data endpoint responded ${res.status}`);
  }
  const data = shape(await res.json());
  writeCache(data);
  return data;
}

/**
 * Fetches app data with cache + dedupe. Pass { fresh: true } to bypass the
 * fresh-window (explicit refresh); the stale fallback still applies.
 */
export async function fetchAppData(opts?: {
  fresh?: boolean;
}): Promise<AppData> {
  const cached = readCache();
  if (!opts?.fresh && cached && Date.now() - cached.at < FRESH_MS) {
    logApi(
      "cache-hit",
      "appData",
      `age ${Math.round((Date.now() - cached.at) / 1000)}s`
    );
    return cached.data;
  }
  if (inFlight) {
    logApi("dedupe", "appData");
    return inFlight;
  }
  inFlight = requestAppData()
    .catch((err) => {
      if (cached) {
        logApi("stale-hit", "appData", "network failed — serving stale cache");
        return cached.data;
      }
      logApi("error", "appData", String(err));
      throw err;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
