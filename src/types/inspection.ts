// ---- Core inspection engine types -------------------------------------------

/**
 * The 5 fixed Luz Health Categories, in inspection flow order.
 * The inspection is navigated BY CATEGORY — areas/zones are gone.
 * Matches the Airtable "Inspection Items" Health Category options exactly.
 */
export const HEALTH_CATEGORIES = [
  "Utilities & Systems",
  "Access & Security",
  "Water & Humidity",
  "Building Interior/Exterior",
  "Outdoor Areas",
] as const;

export type HealthCategory = (typeof HEALTH_CATEGORIES)[number];

export type Severity = "monitor" | "immediate";
export type ZoneStatus = "pending" | "confirmed" | "issue" | "not_applicable";
export type HealthStatus = "good" | "monitor" | "action";

/** One Inspection Item from Airtable (never hardcoded in the app). */
export interface ChecklistItem {
  /** Airtable record id of the Inspection Item (used for linking findings). */
  recordId: string;
  /** Human-readable id, e.g. "II-001". */
  itemId: string;
  /** The Inspection Item text. */
  label: string;
  /** The Guidance text shown under the item. */
  guidance: string;
}

/**
 * One step of the inspection flow — a Health Category with its
 * Airtable inspection items for the selected inspection type.
 * (Kept under the historical name "zone" to limit churn.)
 */
export interface InspectionZone {
  id: string;
  title: HealthCategory;
  /** Short reminder text shown under the category title. */
  reminder: string;
  checklist: ChecklistItem[];
}

export type InspectionStatus = "In Progress" | "Completed";

/** An inspection session, created when the inspector presses Start Inspection. */
export interface InspectionSession {
  inspectionId: string;
  propertyId: string;
  propertyName: string;
  inspectionType: string;
  inspector: string;
  /** Epoch ms. */
  startedAt: number;
  status: InspectionStatus;
}

export interface PhotoAttachment {
  /** Blob object URL for LOCAL preview; the binary is fetched from it at submit. */
  localObjectUrl: string;
  /** Original file name (camera captures may use a generic name). */
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface VoiceRecording {
  /** Blob object URL for LOCAL playback; the binary is fetched from it at submit. */
  localObjectUrl: string;
  durationSec: number;
  /** e.g. "audio/webm" or "audio/mp4" (Safari). */
  mimeType: string;
  sizeBytes: number;
}

/**
 * A finding is raw evidence bound to an Inspection Item. The app knows the
 * property, inspection, type, category and item; the inspector only adds
 * voice (primary), photos (optional) and an optional manual severity.
 * Area/location and final severity are extracted from the voice by n8n
 * (voice severity wins over manual; default Monitor).
 */
export interface Finding {
  /** Stable id assigned at creation, e.g. "fnd-insp-rec…-1-001". */
  findingId: string;
  inspectionId: string;
  propertyId: string;
  /** Category slug (flow step id). */
  zone: string;
  healthCategory: HealthCategory;
  /** Airtable record id of the Inspection Item this finding was raised from. */
  inspectionItemRecordId: string;
  /** Human-readable item id, e.g. "II-014". */
  inspectionItemId: string;
  /** The Inspection Item text. */
  inspectionItem: string;
  /** Manually selected severity — OPTIONAL; null lets the voice/AI decide. */
  severity: Severity | null;
  photos: PhotoAttachment[];
  voiceRecording: VoiceRecording | null;
  optionalNote: string;
  /** ISO timestamp of when the finding was captured. */
  timestamp: string;
}

/** What the Report Finding sheet provides; the app fills in the rest. */
export type FindingDraft = Pick<
  Finding,
  | "inspectionItemRecordId"
  | "inspectionItemId"
  | "inspectionItem"
  | "severity"
  | "photos"
  | "voiceRecording"
  | "optionalNote"
>;

// ---- Property Health preview ----------------------------------------------

/**
 * Local preview only — official health is calculated in n8n from the FINAL
 * severities (voice wins). Findings without a manual severity count as
 * Monitor here, pending AI classification.
 */
export function healthFromFindings(
  findings: Finding[]
): Record<HealthCategory, HealthStatus> {
  const health = Object.fromEntries(
    HEALTH_CATEGORIES.map((c) => [c, "good"])
  ) as Record<HealthCategory, HealthStatus>;
  for (const f of findings) {
    if (f.severity === "immediate") health[f.healthCategory] = "action";
    else if (health[f.healthCategory] !== "action")
      health[f.healthCategory] = "monitor";
  }
  return health;
}
