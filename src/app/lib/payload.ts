// ---- Inspection submission payload (v2 — category-driven flow) -----------------
// The JSON POSTed to n8n on "Complete Inspection". The inspection is navigated
// by Health Category; every finding is bound to an Airtable Inspection Item.
// n8n transcribes voice notes, extracts description/area/severity (voice
// severity wins over the optional manual one, default Monitor), computes
// Property Health and writes to Airtable.

import type {
  Finding,
  InspectionSession,
  InspectionStatus,
  InspectionZone,
  Severity,
  ZoneStatus,
} from "@/types/inspection";

/** Bump when the payload shape changes; n8n validates against this. */
export const PAYLOAD_SCHEMA_VERSION = "2.0";

export interface PhotoMetadata {
  /** Local blob object URL — preview only; the binary travels as multipart. */
  localObjectUrl: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

export interface VoiceMetadata {
  /** Local blob object URL — preview only; the binary travels as multipart. */
  localObjectUrl: string;
  durationSec: number;
  mimeType: string;
  sizeBytes: number;
}

export interface PayloadCategory {
  categoryId: string;
  /** Health Category name, e.g. "Utilities & Systems". */
  category: string;
  status: ZoneStatus;
  durationSeconds: number;
  findingCount: number;
}

export interface PayloadFinding {
  /** Stable id assigned when the finding was created. */
  findingId: string;
  /** Health Category the finding was raised in. */
  healthCategory: string;
  /** Airtable record id of the Inspection Item. */
  inspectionItemRecordId: string;
  /** e.g. "II-014". */
  inspectionItemId: string;
  /** The Inspection Item text. */
  inspectionItem: string;
  /** Optional manual severity; null = let the voice/AI decide. */
  selectedSeverity: Severity | null;
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
    /** Airtable Properties record id. */
    propertyId: string;
    propertyName: string;
    /** One of the four canonical inspection types (matches Airtable). */
    inspectionType: string;
    inspector: string;
    status: InspectionStatus;
    /** ISO timestamp. */
    startedAt: string;
    /** ISO timestamp — null until Complete Inspection is tapped. */
    completedAt: string | null;
    durationSeconds: number | null;
  };
  categories: PayloadCategory[];
  findings: PayloadFinding[];
}

/**
 * Builds the FINAL payload for submission to n8n. Always finalized:
 * status "Completed", ISO completedAt, durationSeconds startedAt → completedAt.
 */
export function buildFinalSubmissionPayload(input: {
  session: InspectionSession;
  zones: InspectionZone[];
  zoneStatuses: ZoneStatus[];
  zoneDurations: number[];
  findings: Finding[];
  /** Epoch ms; defaults to now. */
  completedAt?: number;
}): InspectionSubmissionPayload {
  return buildSubmissionPayload({
    ...input,
    completedAt: input.completedAt ?? Date.now(),
    durationSeconds: null, // ignored — derived from startedAt → completedAt
  });
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

  // Finalization is enforced here, not trusted from the caller.
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
    categories: zones.map((zone, i) => ({
      categoryId: zone.id,
      category: zone.title,
      status: zoneStatuses[i] ?? "pending",
      durationSeconds: zoneDurations[i] ?? 0,
      findingCount: findings.filter((f) => f.zone === zone.id).length,
    })),
    findings: findings.map((f) => ({
      findingId: f.findingId,
      healthCategory: f.healthCategory,
      inspectionItemRecordId: f.inspectionItemRecordId,
      inspectionItemId: f.inspectionItemId,
      inspectionItem: f.inspectionItem,
      selectedSeverity: f.severity,
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
