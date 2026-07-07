// ---- n8n voice-event submission -------------------------------------------------
// The app only captures audio + metadata and ships it to n8n as
// multipart/form-data (n8n needs the audio binary). All business logic —
// transcription, AI structuring, Airtable writes, routing to Activity
// History or Findings — lives in the n8n workflow, never here.

/** Production webhook of the "Luz-app voice" n8n workflow (active). */
export const N8N_VOICE_EVENT_WEBHOOK_URL =
  "https://automation.vallendiz.com/webhook/luz-voice-event";

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
  form.append("recordedAt", submission.recordedAt);
  form.append("recordingDuration", String(submission.recordingDuration));
  form.append(
    "audio",
    submission.audio,
    `voice-event.${fileExtension(submission.audioMimeType)}`
  );

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
