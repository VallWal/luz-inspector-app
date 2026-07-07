// ---- n8n submission ------------------------------------------------------------
// Multipart submission: the JSON payload goes in the "payload" form field, and
// the actual photo/voice binaries are attached as files (photo__<findingId>__<n>,
// voice__<findingId>). n8n transcribes voice notes into Raw Transcript and
// uploads photos/audio into the Finding's attachment columns. No Airtable
// connection here — n8n owns everything downstream of the webhook.

import type { InspectionSubmissionPayload } from "./payload";

/** Production webhook of "Luz - Inspection Submit - CLAUDE" (active). It creates
 * the Inspection, a linked Property Health snapshot, and one Finding per app
 * finding (with photos + transcribed voice) in Airtable. */
export const N8N_WEBHOOK_URL =
  "https://automation.vallendiz.com/webhook/luz-inspection-submit-claude";

export interface SubmissionResult {
  status: number;
  /** Raw response body (n8n may return JSON or an empty string). */
  body: string;
}

/** Fetch a blob: object URL back into a Blob. Returns null if it's gone
 * (e.g. after a reload) — the submission then simply omits that file. */
async function blobFromObjectUrl(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

/** POSTs the payload + photo/voice binaries as multipart/form-data.
 * Throws on network failure or non-2xx response. */
export async function submitInspectionPayload(
  payload: InspectionSubmissionPayload
): Promise<SubmissionResult> {
  const form = new FormData();
  form.append("payload", JSON.stringify(payload));

  for (const finding of payload.findings) {
    for (let i = 0; i < finding.photos.length; i++) {
      const photo = finding.photos[i];
      const blob = await blobFromObjectUrl(photo.localObjectUrl);
      if (blob) {
        form.append(
          `photo__${finding.findingId}__${i}`,
          blob,
          photo.name || `photo-${i}.jpg`
        );
      }
    }
    if (finding.voiceRecording) {
      const blob = await blobFromObjectUrl(
        finding.voiceRecording.localObjectUrl
      );
      if (blob) {
        form.append(
          `voice__${finding.findingId}`,
          blob,
          `voice-${finding.findingId}.webm`
        );
      }
    }
  }

  // No Content-Type header — the browser sets the multipart boundary itself.
  const res = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    body: form,
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Webhook responded ${res.status}: ${body.slice(0, 200)}`);
  }
  return { status: res.status, body };
}
