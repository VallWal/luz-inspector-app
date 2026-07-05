// ---- Core inspection engine types -------------------------------------------

/**
 * The 5 fixed Luz Property Health dimensions.
 * These never change from property to property.
 */
export const HEALTH_DIMENSIONS = [
  "Security & Access",
  "Water & Humidity",
  "Utilities & Systems",
  "Building Condition",
  "Outdoor Areas",
] as const;

export type HealthDimension = (typeof HEALTH_DIMENSIONS)[number];

export type Severity = "monitor" | "immediate";
export type ZoneStatus = "pending" | "confirmed" | "issue";
export type HealthStatus = "good" | "monitor" | "action";

export interface ChecklistItem {
  id: string;
  label: string;
  healthDimension: HealthDimension;
  isRequired?: boolean;
}

export interface InspectionZone {
  id: string;
  title: string;
  /** Short reminder text shown under the zone title. */
  reminder: string;
  checklist: ChecklistItem[];
  /** Zone is only included for properties that have this feature (e.g. "poolGarden"). */
  requiresFeature?: string;
}

export interface InspectionTypeConfig {
  id: string;
  title: string;
  zones: InspectionZone[];
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

export interface VoiceRecording {
  /**
   * Blob object URL for LOCAL playback/preview only. It is not a usable
   * file URL outside this browser session and cannot be sent to n8n.
   * Raw audio upload will be implemented with the backend integration.
   */
  localObjectUrl: string;
  durationSec: number;
  /** e.g. "audio/webm" or "audio/mp4" (Safari). */
  mimeType: string;
  sizeBytes: number;
}

/**
 * A finding is raw evidence. The inspector captures facts
 * (health area, severity, photos, voice); nothing is classified in-app.
 *
 * Future pipeline (not implemented here): on submission the app sends
 * findings to n8n → Whisper transcribes the voice note → an LLM receives
 * zone, health dimension, transcript, inspection type, zone checklist and
 * photos, and returns finding title, checklist item, owner-friendly
 * description and recommendation. n8n computes Property Health and writes
 * to Airtable, from which the PDF report and Owner Portal are generated.
 */
export interface Finding {
  /** Stable id assigned at creation, e.g. "fnd-insp-p-014-1-001". */
  findingId: string;
  inspectionId: string;
  propertyId: string;
  /** Zone id from the inspection type config. */
  zone: string;
  healthDimension: HealthDimension;
  severity: Severity;
  /** Object URLs of attached photos. */
  photos: string[];
  voiceRecording: VoiceRecording | null;
  optionalNote: string;
  /** ISO timestamp of when the finding was captured. */
  timestamp: string;
}

/** What the inspector provides in the Report Finding sheet; the app fills in the rest. */
export type FindingDraft = Pick<
  Finding,
  "healthDimension" | "severity" | "photos" | "voiceRecording" | "optionalNote"
>;

// ---- Property Health derivation ----------------------------------------------

/**
 * Green if no findings in a dimension, yellow if at least one Monitor
 * finding, red if at least one Immediate Action finding.
 */
export function healthFromFindings(
  findings: Finding[]
): Record<HealthDimension, HealthStatus> {
  const health = Object.fromEntries(
    HEALTH_DIMENSIONS.map((d) => [d, "good"])
  ) as Record<HealthDimension, HealthStatus>;
  for (const f of findings) {
    if (f.severity === "immediate") health[f.healthDimension] = "action";
    else if (health[f.healthDimension] !== "action")
      health[f.healthDimension] = "monitor";
  }
  return health;
}
