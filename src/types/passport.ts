// ---- Property Passport capture types ------------------------------------------
// The passport is captured hub-and-spoke: six sections filled in any order.
// Structured Airtable tables are the source of truth — the app collects/updates
// their data and submits once; n8n writes everything (Decision 003).

import type { PhotoAttachment } from "./inspection";

// ---- Property specs (Properties table fields the passport maintains) -----------

export const PROPERTY_TYPES = [
  "Apartment",
  "Townhouse",
  "Villa",
  "Finca",
  "Other",
] as const;

/** The 8 Yes/No feature selects on Properties (exact Airtable field names). */
export const FEATURE_FIELDS = [
  "Pool",
  "Garden",
  "Terrace",
  "Garage",
  "Air Conditioning",
  "Heating",
  "Fireplace",
  "Solar",
] as const;

export type FeatureField = (typeof FEATURE_FIELDS)[number];

export interface PropertySpecs {
  propertyType: string;
  constructionYear: number | null;
  floorArea: number | null;
  plotSize: number | null;
  floors: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  /** "Yes" | "No" | "" (unset) per feature — exact Airtable option strings. */
  features: Record<FeatureField, string>;
  /** New hero photo for Properties.Property Image (optional). */
  heroPhoto: PhotoAttachment | null;
}

// ---- Inventory sections ---------------------------------------------------------

export type InventoryKind = "utility" | "appliance" | "contact" | "key" | "note";

export const UTILITY_TYPES = [
  "Electricity",
  "Water",
  "Internet",
  "Climate",
  "Pool pump",
] as const;

export const APPLIANCE_TYPES = [
  "Boiler",
  "Dishwasher",
  "Washing Machine",
  "Fridge",
  "Pool Pump",
  "Irrigation System",
  "Fuse Board",
] as const;

export const CONTACT_TYPES = [
  "Pool Maintenance",
  "Gardener",
  "Security Company",
  "Neighbor",
] as const;

/** Property Notes types — exact Airtable options. */
export const NOTE_TYPES = [
  "Instructions",
  "Property Access",
  "Problematic Area",
] as const;

/**
 * One inventory record (new or edited). Field keys are generic; each kind
 * uses a subset — see SECTION_FIELDS in the UI config.
 */
export interface InventoryItem {
  /** Local id for draft/photo bookkeeping, e.g. "u-3". */
  localId: string;
  /** Airtable record id when editing an existing record; null = new. */
  recordId: string | null;
  kind: InventoryKind;
  type: string;
  /** Generic text fields; only the keys relevant to the kind are used. */
  fields: Record<string, string>;
  /** New photos to attach (existing attachments stay untouched in Airtable). */
  photos: PhotoAttachment[];
  /** Count of photos already on the record in Airtable (display only). */
  existingPhotoCount: number;
  /** True when an existing record's fields were changed (include in payload). */
  dirty: boolean;
}

// ---- Baseline photos --------------------------------------------------------------

export type BaselineType = "Interior" | "Exterior" | "";

/** One baseline photo → one Photos Baseline record (per-photo type/title/date). */
export interface BaselinePhotoDraft {
  localId: string;
  photo: PhotoAttachment;
  type: BaselineType;
  title: string;
  location: string;
  /** ISO date (YYYY-MM-DD) — file date for library picks, today for camera. */
  capturedOn: string;
}

// ---- Session ---------------------------------------------------------------------

export interface PassportSession {
  passportId: string;
  propertyId: string;
  propertyName: string;
  inspector: string;
  startedAt: number;
}

export interface PassportDraftState {
  session: PassportSession;
  specs: PropertySpecs;
  /** Snapshot of specs as fetched — used to detect changes for the summary. */
  specsChanged: boolean;
  items: InventoryItem[];
  baselinePhotos: BaselinePhotoDraft[];
}

// ---- Existing data fetched from Airtable (via n8n) --------------------------------

export interface ExistingRecordSummary {
  recordId: string;
  type: string;
  fields: Record<string, string>;
  photoCount: number;
}

export interface PassportExistingData {
  specs: Omit<PropertySpecs, "heroPhoto">;
  utilities: ExistingRecordSummary[];
  appliances: ExistingRecordSummary[];
  contacts: ExistingRecordSummary[];
  keys: ExistingRecordSummary[];
  notes: ExistingRecordSummary[];
  baselinePhotoCount: number;
}

// ---- AI extraction ------------------------------------------------------------------

/** Fields the vision model may return; app applies only the relevant ones. */
export interface ExtractedFields {
  brand?: string;
  model?: string;
  provider?: string;
  meterNo?: string;
  installed?: string;
  quantity?: string;
  location?: string;
}
