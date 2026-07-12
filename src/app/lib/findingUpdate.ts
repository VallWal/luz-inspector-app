// ---- Standalone finding resolution (outside inspections) ---------------------------
// The finding lifecycle is independent of inspections: found during an
// inspection, fixed by a contractor later, verified on a quick visit. This
// small endpoint closes a finding WITHOUT creating a fake inspection —
// n8n sets Status = Resolved + "Resolved on" and logs a Maintenance Event
// in the property timeline. The webhook responds only after both writes
// succeeded (a failure keeps the finding open in the app).

import { logApi } from "./apiLog";

/** Production webhook of "Luz - Finding Update - CLAUDE". */
export const N8N_FINDING_UPDATE_URL =
  "https://automation.vallendiz.com/webhook/luz-finding-update";

function isoDateToday(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Marks one finding as Resolved. Throws on failure — the caller keeps the
 * finding visible and lets the inspector retry. */
export async function resolveFinding(input: {
  findingRecordId: string;
  findingId: string;
  description: string;
  propertyId: string;
  propertyName: string;
  inspector: string;
}): Promise<void> {
  logApi("request", "findingUpdate", input.findingId);
  const res = await fetch(N8N_FINDING_UPDATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      newStatus: "Resolved",
      resolvedOn: isoDateToday(),
    }),
  });
  if (!res.ok) {
    logApi("error", "findingUpdate", `status ${res.status}`);
    throw new Error(`Finding update endpoint responded ${res.status}`);
  }
}
