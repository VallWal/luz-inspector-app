// ---- n8n voice-event submission -------------------------------------------------
// The app only captures audio + optional photos + metadata and ships them to
// n8n as multipart/form-data. All business logic — transcription, AI
// extraction (Description / Person involved / Type), Airtable writes into the
// Events table — lives in the "Luz-app voice" n8n workflow, never here.

import { compressPhoto } from "./submission";

/** Production webhook of the "Luz-app voice" n8n workflow (active). */
export const N8N_VOICE_EVENT_WEBHOOK_URL =
  "https://automation.vallendiz.com/webhook/luz-voice-event";

export interface EventPhoto {
  blob: Blob;
  name: string;
}

export interface VoiceEventSubmission {
  /** Recorded audio blob (e.g. audio/webm or audio/mp4, browser-dependent). */
  audio: Blob;
  audioMimeType: string;
  /** Duration in seconds. */
  recordingDuration: number;
  /** ISO timestamp of when the recording was made. */
  recordedAt: string;
  propertyId?: string;
  propertyName?: string;
  /** Inspector / user name for the Events "Created by" column. */
  createdBy?: string;
  /** Optional photos; compressed on-device before upload. */
  photos?: EventPhoto[];
}

export interface SubmissionResult {
  status: number;
  body: string;
}

/** Extension guess for the uploaded file name, based on the recorder's mime type. */
function fileExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

/** POSTs the voice event as multipart/form-data. Throws on network failure or non-2xx. */
export async function submitVoiceEvent(
  submission: VoiceEventSubmission
): Promise<SubmissionResult> {
  const form = new FormData();
  form.append("source", "luz_app");
  form.append("eventType", "voice_event");
  if (submission.propertyId) form.append("propertyId", submission.propertyId);
  if (submission.propertyName)
    form.append("propertyName", submission.propertyName);
  if (submission.createdBy) form.append("createdBy", submission.createdBy);
  form.append("recordedAt", submission.recordedAt);
  form.append("recordingDuration", String(submission.recordingDuration));
  form.append(
    "audio",
    submission.audio,
    `voice-event.${fileExtension(submission.audioMimeType)}`
  );

  const photos = submission.photos ?? [];
  for (let i = 0; i < photos.length; i++) {
    const compressed = await compressPhoto(photos[i].blob);
    const baseName = (photos[i].name || `photo-${i}`).replace(
      /\.[A-Za-z0-9]+$/,
      ""
    );
    const isJpeg = compressed.type === "image/jpeg";
    form.append(
      `photo_${i}`,
      compressed,
      isJpeg ? `${baseName}.jpg` : photos[i].name || `photo-${i}.jpg`
    );
  }

  // No Content-Type header — the browser sets multipart/form-data with the
  // correct boundary automatically.
  const res = await fetch(N8N_VOICE_EVENT_WEBHOOK_URL, {
    method: "POST",
    body: form,
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Webhook responded ${res.status}: ${body.slice(0, 200)}`);
  }
  return { status: res.status, body };
}
