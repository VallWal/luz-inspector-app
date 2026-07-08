// ---- Property data -----------------------------------------------------------
// Zones, checklists and health dimensions are NOT defined here — they come from
// the inspection type configs in src/config. Properties only declare which
// optional features they have (e.g. "poolGarden").

export interface Property {
  id: string;
  name: string;
  code: string;
  kind: string;
  address: string;
  lastInspection: string;
  accessNotes: string;
  ownerNote?: string;
  /** Optional features that enable conditional zones (e.g. "poolGarden"). */
  features: string[];
}

/** Current inspector (auth comes later). */
export const inspector = "Walter Vallaster";

// ---- Property notes ------------------------------------------------------------
// Mock data mirroring the Airtable "Notes" table structure. Will be replaced by
// an Airtable fetch later — keep the shape identical.

export type NoteType = "Instructions" | "Property Access" | "Problematic Area";

export interface PropertyNote {
  noteId: string;
  propertyId: string;
  summary: string;
  type: NoteType;
  /** Optional photo URL. */
  photo?: string;
}

export const propertyNotes: PropertyNote[] = [
  // Villa Vista Mar
  {
    noteId: "n-001",
    propertyId: "p-014",
    type: "Property Access",
    summary: "Key box at side gate, code 4471. Alarm is off.",
  },
  {
    noteId: "n-002",
    propertyId: "p-014",
    type: "Instructions",
    summary: "Owners arrive July 18 — check pool cover before then.",
  },
  {
    noteId: "n-003",
    propertyId: "p-014",
    type: "Instructions",
    summary: "Gardener on site Fridays — coordinate outdoor checks.",
  },
  {
    noteId: "n-004",
    propertyId: "p-014",
    type: "Problematic Area",
    summary: "Damp patch on garage ceiling — recheck after rain.",
  },
  // Casa Olivo
  {
    noteId: "n-005",
    propertyId: "p-007",
    type: "Property Access",
    summary: "Smart lock — code in the app. Cleaner finishes at 11:00.",
  },
  {
    noteId: "n-006",
    propertyId: "p-007",
    type: "Problematic Area",
    summary: "Kitchen tap drips when closed too softly — verify washer.",
  },
  // Finca El Roble
  {
    noteId: "n-007",
    propertyId: "p-021",
    type: "Property Access",
    summary: "Main gate remote in office. Dogs next door — keep gate closed.",
  },
  {
    noteId: "n-008",
    propertyId: "p-021",
    type: "Instructions",
    summary: "Irrigation timer replaced in June — verify it runs at 15:30.",
  },
  {
    noteId: "n-009",
    propertyId: "p-021",
    type: "Problematic Area",
    summary: "Loose railing on pool terrace steps — flagged last visit.",
  },
];

/** Live notes fetched from Airtable via n8n; null until the fetch succeeds. */
let liveNotes: PropertyNote[] | null = null;

/** Swap the mock notes for live Airtable notes (called once after fetch). */
export function setLiveNotes(notes: PropertyNote[]) {
  liveNotes = notes;
}

/** Notes for one property, in the fixed display order of the three groups. */
export function notesForProperty(propertyId: string): PropertyNote[] {
  return (liveNotes ?? propertyNotes).filter(
    (n) => n.propertyId === propertyId
  );
}

// NOTE: There is intentionally NO hardcoded property list. Properties are
// always loaded from Airtable via the n8n "Luz - App Get Properties - CLAUDE"
// webhook (see lib/appData.ts) — real record IDs are required so n8n can
// link Events and Inspections to the right Property record.

