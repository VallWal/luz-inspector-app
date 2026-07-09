// ---- App data from Airtable (via n8n) --------------------------------------------
// The app never talks to Airtable directly. The "Luz - App Get Properties - CLAUDE"
// n8n workflow exposes active Properties (with their real Airtable record IDs) and
// Property Notes in exactly the shapes the app uses. If the endpoint is
// unreachable, callers fall back to the built-in mock data.

import type {
  InspectionItem,
  OpenFinding,
  Property,
  PropertyNote,
} from "../data";

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

/** Fetches live properties + notes. Throws on network failure or non-2xx. */
export async function fetchAppData(): Promise<AppData> {
  const res = await fetch(N8N_APP_DATA_URL, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`App data endpoint responded ${res.status}`);
  }
  const data = await res.json();
  return {
    properties: Array.isArray(data.properties) ? data.properties : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    inspectionItems: Array.isArray(data.inspectionItems)
      ? data.inspectionItems
      : [],
    openFindings: Array.isArray(data.openFindings) ? data.openFindings : [],
  };
}
