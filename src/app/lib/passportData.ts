// ---- Passport data fetch (Airtable via n8n) ---------------------------------------
// Loads the property's current passport data so the capture flow starts
// pre-filled: specs + existing utilities/appliances/contacts/keys and the
// baseline photo count. The app never talks to Airtable directly.
//
// Access policy (one webhook call = 6 Airtable reads in n8n):
//   - in-flight dedupe per property (Strict Mode double-mount = 1 request)
//   - short in-memory cache per property (opening the hub twice in a row
//     does not refetch)
//   - invalidated after a successful passport submit

import type {
  ExistingRecordSummary,
  FeatureField,
  PassportExistingData,
} from "@/types/passport";
import { FEATURE_FIELDS } from "@/types/passport";
import { logApi } from "./apiLog";

/** Production webhook of "Luz - Passport Data - CLAUDE". */
export const N8N_PASSPORT_DATA_URL =
  "https://automation.vallendiz.com/webhook/luz-passport-data";

const FRESH_MS = 5 * 60 * 1000;

const cache = new Map<string, { at: number; data: PassportExistingData }>();
const inFlight = new Map<string, Promise<PassportExistingData>>();

/** Drop the cached data for a property (call after a successful submit). */
export function invalidatePassportData(propertyId: string) {
  cache.delete(propertyId);
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function records(v: unknown): ExistingRecordSummary[] {
  if (!Array.isArray(v)) return [];
  return v.map((r) => ({
    recordId: str(r.recordId),
    type: str(r.type),
    fields:
      r.fields && typeof r.fields === "object"
        ? (r.fields as Record<string, string>)
        : {},
    photoCount: typeof r.photoCount === "number" ? r.photoCount : 0,
  }));
}

async function requestPassportData(
  propertyId: string
): Promise<PassportExistingData> {
  logApi("request", "passportData", propertyId);
  const res = await fetch(
    `${N8N_PASSPORT_DATA_URL}?propertyId=${encodeURIComponent(propertyId)}`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) {
    throw new Error(`Passport data endpoint responded ${res.status}`);
  }
  const data = await res.json();
  const specs = data.specs ?? {};
  const features = {} as Record<FeatureField, string>;
  for (const f of FEATURE_FIELDS) {
    features[f] = str(specs.features?.[f]);
  }
  const shaped: PassportExistingData = {
    specs: {
      propertyType: str(specs.propertyType),
      constructionYear: num(specs.constructionYear),
      floorArea: num(specs.floorArea),
      plotSize: num(specs.plotSize),
      floors: num(specs.floors),
      bedrooms: num(specs.bedrooms),
      bathrooms: num(specs.bathrooms),
      features,
    },
    utilities: records(data.utilities),
    appliances: records(data.appliances),
    contacts: records(data.contacts),
    keys: records(data.keys),
    notes: records(data.notes),
    baselinePhotoCount:
      typeof data.baselinePhotoCount === "number" ? data.baselinePhotoCount : 0,
  };
  cache.set(propertyId, { at: Date.now(), data: shaped });
  return shaped;
}

/** Fetches existing passport data for one property (cached + deduped). */
export async function fetchPassportData(
  propertyId: string
): Promise<PassportExistingData> {
  const cached = cache.get(propertyId);
  if (cached && Date.now() - cached.at < FRESH_MS) {
    logApi("cache-hit", "passportData", propertyId);
    return cached.data;
  }
  const pending = inFlight.get(propertyId);
  if (pending) {
    logApi("dedupe", "passportData", propertyId);
    return pending;
  }
  const p = requestPassportData(propertyId)
    .catch((err) => {
      if (cached) {
        logApi("stale-hit", "passportData", propertyId);
        return cached.data;
      }
      logApi("error", "passportData", String(err));
      throw err;
    })
    .finally(() => {
      inFlight.delete(propertyId);
    });
  inFlight.set(propertyId, p);
  return p;
}
