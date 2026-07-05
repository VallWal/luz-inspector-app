// ---- n8n submission ------------------------------------------------------------
// JSON-only for now: photos and audio stay local (localObjectUrl is preview
// only); binary upload will be added later. No Airtable connection here —
// n8n owns everything downstream of the webhook.

import type { InspectionSubmissionPayload } from "./payload";

/** n8n TEST webhook — switch to the production URL when the workflow goes live. */
export const N8N_WEBHOOK_URL =
  "https://automation.vallendiz.com/webhook-test/luz-inspection-submit";

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
