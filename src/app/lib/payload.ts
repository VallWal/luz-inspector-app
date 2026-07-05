// ---- Inspection submission payload -------------------------------------------
// The exact JSON that will later be POSTed to n8n on "Complete Inspection".
// n8n then transcribes voice notes, classifies findings via LLM, computes
// Property Health and writes to Airtable. No backend yet — this only builds
// the object so it can be verified in the Summary screen's developer section.

import type {
  Finding,
  HealthDimension,
  InspectionSession,
  InspectionStatus,
  InspectionZone,
  Severity,
  ZoneStatus,
} from "@/types/inspection";

/** Bump when the payload shape changes; n8n validates against this. */
export const PAYLOAD_SCHEMA_VERSION = "1.0";

export interface PhotoMetadata {
  /**
   * Local blob object URL — preview/debugging ONLY. n8n cannot fetch this;
   * it only exists inside the inspector's browser session. The raw photo
   * file will be uploaded separately once the backend is implemented.
   */
  localObjectUrl: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface VoiceMetadata {
  /**
   * Local blob object URL — preview/debugging ONLY. n8n cannot fetch this;
   * it only exists inside the inspector's browser session. The raw audio
   * file will be uploaded separately once the backend is implemented.
   */
  localObjectUrl: string;
  durationSec: number;
  mimeType: string;
  sizeBytes: number;
}

export interface PayloadZone {
  zoneId: string;
  title: string;
  status: ZoneStatus;
  durationSeconds: number;
  findingCount: number;
}

export interface PayloadFinding {
  /** Stable id assigned when the finding was created. */
  findingId: string;
  zoneId: string;
  zoneTitle: string;
  healthDimension: HealthDimension;
  severity: Severity;
  /** ISO timestamp of when the finding was captured. */
  timestamp: string;
  optionalNote: string;
  photoCount: number;
  photos: PhotoMetadata[];
  voiceRecording: VoiceMetadata | null;
}

export interface InspectionSubmissionPayload {
  schemaVersion: typeof PAYLOAD_SCHEMA_VERSION;
  inspection: {
    inspectionId: string;
    propertyId: string;
    propertyName: string;
    inspectionType: string;
    inspector: string;
    status: InspectionStatus;
    /** ISO timestamp. */
    startedAt: string;
    /** ISO timestamp — null until Complete Inspection is tapped. */
    completedAt: string | null;
    durationSeconds: number | null;
  };
  zones: PayloadZone[];
  findings: PayloadFinding[];
  // NOTE: no propertyHealthPreview here — Property Health is calculated
  // officially in n8n. The app only shows a local preview in the UI.
}

export function buildSubmissionPayload(input: {
  session: InspectionSession;
  zones: InspectionZone[];
  zoneStatuses: ZoneStatus[];
  zoneDurations: number[];
  findings: Finding[];
  /** Epoch ms — null while the inspection is still open. */
  completedAt: number | null;
  durationSeconds: number | null;
}): InspectionSubmissionPayload {
  const {
    session,
    zones,
    zoneStatuses,
    zoneDurations,
    findings,
    completedAt,
    durationSeconds,
  } = input;

  const zoneTitle = (id: string) =>
    zones.find((z) => z.id === id)?.title ?? id;

  // Finalization is enforced here, not trusted from the caller: as soon as
  // completedAt is provided, the payload is a final submission — status must
  // be "Completed" and durationSeconds is derived startedAt → completedAt.
  const isFinal = completedAt != null;

  return {
    schemaVersion: PAYLOAD_SCHEMA_VERSION,
    inspection: {
      inspectionId: session.inspectionId,
      propertyId: session.propertyId,
      propertyName: session.propertyName,
      inspectionType: session.inspectionType,
      inspector: session.inspector,
      status: isFinal ? "Completed" : session.status,
      startedAt: new Date(session.startedAt).toISOString(),
      completedAt: isFinal ? new Date(completedAt).toISOString() : null,
      durationSeconds: isFinal
        ? Math.max(0, Math.round((completedAt - session.startedAt) / 1000))
        : durationSeconds,
    },
    zones: zones.map((zone, i) => ({
      zoneId: zone.id,
      title: zone.title,
      status: zoneStatuses[i] ?? "pending",
      durationSeconds: zoneDurations[i] ?? 0,
      findingCount: findings.filter((f) => f.zone === zone.id).length,
    })),
    findings: findings.map((f) => ({
      findingId: f.findingId,
      zoneId: f.zone,
      zoneTitle: zoneTitle(f.zone),
      healthDimension: f.healthDimension,
      severity: f.severity,
      timestamp: f.timestamp,
      optionalNote: f.optionalNote,
      photoCount: f.photos.length,
      photos: f.photos.map((p) => ({
        localObjectUrl: p.localObjectUrl,
        name: p.name,
        mimeType: p.mimeType,
        sizeBytes: p.sizeBytes,
      })),
      voiceRecording: f.voiceRecording
        ? {
            localObjectUrl: f.voiceRecording.localObjectUrl,
            durationSec: f.voiceRecording.durationSec,
            mimeType: f.voiceRecording.mimeType,
            sizeBytes: f.voiceRecording.sizeBytes,
          }
        : null,
    })),
  };
}
