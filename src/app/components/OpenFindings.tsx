"use client";

import { useState } from "react";
import {
  inspector,
  openFindingsForProperty,
  removeLiveOpenFinding,
  type OpenFinding,
} from "../data";
import { removeOpenFindingFromCache } from "../lib/appData";
import { resolveFinding } from "../lib/findingUpdate";
import { CheckIcon } from "./icons";

/**
 * Open (not resolved) findings for the selected property. Each card can be
 * closed directly with "✓ Fixed" — the typical case: found during an
 * inspection, fixed by a contractor, verified on a quick visit WITHOUT
 * running a full inspection. The update writes immediately (no draft);
 * on failure the finding simply stays open and can be tapped again.
 */
export default function OpenFindings({
  propertyId,
  propertyName,
}: {
  propertyId: string;
  propertyName?: string;
}) {
  // Re-render trigger after the module-level list changes.
  const [, setVersion] = useState(0);
  const [sending, setSending] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const findings = openFindingsForProperty(propertyId);
  if (findings.length === 0) return null;

  const markFixed = async (f: OpenFinding) => {
    if (sending) return;
    setSending(f.recordId);
    setError(null);
    try {
      await resolveFinding({
        findingRecordId: f.recordId,
        findingId: f.findingId,
        description: f.description,
        propertyId,
        propertyName: propertyName ?? "",
        inspector,
      });
      removeLiveOpenFinding(f.recordId);
      removeOpenFindingFromCache(f.recordId);
      setVersion((v) => v + 1);
    } catch (err) {
      console.error("Finding resolve failed", err);
      setError("Could not save — check the connection and try again.");
    } finally {
      setSending(null);
      setConfirming(null);
    }
  };

  return (
    <section className="mx-5 mt-4 rounded-3xl bg-white px-6 py-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
        ⚠ Open Findings ({findings.length})
      </p>
      {error && (
        <p className="mt-2 text-xs font-semibold text-status-red">{error}</p>
      )}
      <ul className="mt-3 flex flex-col gap-3">
        {findings.map((f) => {
          const isRed = f.severity !== "Monitor";
          const isSending = sending === f.recordId;
          const isConfirming = confirming === f.recordId;
          return (
            <li key={f.recordId} className="flex items-start gap-3">
              {f.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.photoUrl}
                  alt=""
                  className="size-14 shrink-0 rounded-xl object-cover shadow-sm"
                />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-beige-soft text-lg">
                  ⚠
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isRed
                        ? "bg-status-red-soft text-status-red"
                        : "bg-status-yellow-soft text-status-yellow"
                    }`}
                  >
                    {f.severity || "—"}
                  </span>
                  <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[11px] font-medium text-navy/60">
                    {f.status}
                  </span>
                  <span className="text-[11px] font-medium text-navy/40">
                    {f.findingId}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-snug text-navy/80">
                  {f.description || "No description"}
                </p>
                {isConfirming ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => markFixed(f)}
                      disabled={isSending}
                      className="flex h-9 items-center gap-1.5 rounded-xl bg-status-green px-3 text-xs font-semibold text-white shadow-sm active:scale-95 disabled:opacity-60"
                    >
                      {isSending ? (
                        <>
                          <span className="size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <CheckIcon size={13} /> Confirm fixed
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setConfirming(null)}
                      disabled={isSending}
                      className="flex h-9 items-center rounded-xl px-3 text-xs font-semibold text-navy/50 active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirming(f.recordId)}
                    disabled={sending !== null}
                    className="mt-2 flex h-9 items-center gap-1.5 rounded-xl border-2 border-status-green/30 bg-status-green-soft px-3 text-xs font-semibold text-status-green active:scale-95 disabled:opacity-50"
                  >
                    <CheckIcon size={13} /> Fixed
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
