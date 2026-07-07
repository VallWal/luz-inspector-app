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

/** File extension matching the recorder's actual mime type — iOS Safari
 * records audio/mp4, Chrome records audio/webm. A wrong extension can break
 * transcription downstream. */
function audioExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

/** Max photo edge in px and JPEG quality for client-side compression. Keeps
 * uploads small (webhook limit) and safely under Airtable's 5 MB/file cap. */
const PHOTO_MAX_DIMENSION = 1600;
const PHOTO_JPEG_QUALITY = 0.8;

/** Downscale + re-encode a photo as JPEG on-device. Falls back to the
 * original blob on any error or if compression wouldn't help. */
async function compressPhoto(blob: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob, {
      imageOrientation: "from-image",
    });
    const scale = Math.min(
      1,
      PHOTO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height)
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const compressed = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", PHOTO_JPEG_QUALITY)
    );
    // Only use the compressed version if it actually helps.
    return compressed && compressed.size < blob.size ? compressed : blob;
  } catch {
    return blob;
  }
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
        const compressed = await compressPhoto(blob);
        const baseName = (photo.name || `photo-${i}`).replace(
          /\.[A-Za-z0-9]+$/,
          ""
        );
        const isJpeg = compressed.type === "image/jpeg";
        form.append(
          `photo__${finding.findingId}__${i}`,
          compressed,
          isJpeg ? `${baseName}.jpg` : photo.name || `photo-${i}.jpg`
        );
      }
    }
    if (finding.voiceRecording) {
      const blob = await blobFromObjectUrl(
        finding.voiceRecording.localObjectUrl
      );
      if (blob) {
        const ext = audioExtension(
          blob.type || finding.voiceRecording.mimeType || ""
        );
        form.append(
          `voice__${finding.findingId}`,
          blob,
          `voice-${finding.findingId}.${ext}`
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
