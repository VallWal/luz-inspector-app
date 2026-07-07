// ---- n8n submission ------------------------------------------------------------
// JSON-only for now: photos and audio stay local (localObjectUrl is preview
// only); binary upload will be added later. No Airtable connection here —
// n8n owns everything downstream of the webhook.

import type { InspectionSubmissionPayload } from "./payload";

/** Production webhook of "Luz - Inspection Submit - CLAUDE" (active). It creates
 * the Inspection, a linked Property Health snapshot, and one Finding per app
 * finding in Airtable. */
export const N8N_WEBHOOK_URL =
  "https://automation.vallendiz.com/webhook/luz-inspection-submit-claude";

export interface SubmissionResult {
  status: number;
  /** Raw response body (n8n may return JSON or an empty string). */
  body: string;
}

/** POSTs the payload as JSON. Throws on network failure or non-2xx response. */
export async function submitInspectionPayload(
  payload: InspectionSubmissionPayload
): Promise<SubmissionResult> {
  const res = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Webhook responded ${res.status}: ${body.slice(0, 200)}`);
  }
  return { status: res.status, body };
}
