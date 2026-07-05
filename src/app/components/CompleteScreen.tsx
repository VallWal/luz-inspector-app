"use client";

import { useMemo } from "react";
import type { Property } from "../data";
import type {
  Finding,
  InspectionSession,
  InspectionZone,
  ZoneStatus,
} from "@/types/inspection";
import { buildSubmissionPayload } from "../lib/payload";
import { formatDuration } from "../lib/duration";
import { CheckIcon } from "./icons";
import DevPayloadSection from "./DevPayloadSection";

interface Props {
  property: Property;
  session: InspectionSession;
  zones: InspectionZone[];
  zoneStatuses: ZoneStatus[];
  zoneDurations: number[];
  findings: Finding[];
  durationSeconds: number | null;
  /** Epoch ms, set when Complete Inspection was tapped. */
  completedAt: number | null;
  onDone: () => void;
}

export default function CompleteScreen({
  property,
  session,
  zones,
  zoneStatuses,
  zoneDurations,
  findings,
  durationSeconds,
  completedAt,
  onDone,
}: Props) {
  const confirmedCount = zoneStatuses.filter((s) => s === "confirmed").length;

  // Derived directly from live state on every render — there is no cached
  // intermediate payload that could show stale "In Progress" values.
  // completedAt != null makes buildSubmissionPayload emit status "Completed",
  // an ISO completedAt and the final startedAt → completedAt duration.
  const finalPayload = useMemo(
    () =>
      buildSubmissionPayload({
        session,
        zones,
        zoneStatuses,
        zoneDurations,
        findings,
        completedAt,
        durationSeconds,
      }),
    [
      session,
      zones,
      zoneStatuses,
      zoneDurations,
      findings,
      completedAt,
      durationSeconds,
    ]
  );

  return (
    <div className="flex min-h-full flex-col">
      <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="relative flex items-center justify-center">
          <span className="anim-ring absolute size-28 rounded-full bg-status-green/30" />
          <span className="anim-ring-late absolute size-28 rounded-full bg-status-green/20" />
          <div className="anim-pop relative flex size-28 items-center justify-center rounded-full bg-status-green text-white shadow-lg shadow-status-green/30">
            <CheckIcon size={52} />
          </div>
        </div>
        <h1 className="anim-rise mt-8 text-2xl font-semibold text-navy">
          Inspection Complete
        </h1>
        <p className="anim-rise mt-2 text-sm text-navy/60">
          Inspection saved successfully
        </p>
        <p className="anim-rise mt-1 text-sm text-navy/50">
          {property.name} · {property.code}
        </p>

        <div className="anim-rise mt-8 grid w-full grid-cols-3 gap-3">
          <div className="rounded-3xl bg-white px-3 py-4 shadow-sm">
            <p className="text-xl font-semibold text-status-green">
              {confirmedCount}
            </p>
            <p className="mt-0.5 text-xs text-navy/50">confirmed</p>
          </div>
          <div className="rounded-3xl bg-white px-3 py-4 shadow-sm">
            <p className="text-xl font-semibold text-status-yellow">
              {findings.length}
            </p>
            <p className="mt-0.5 text-xs text-navy/50">findings</p>
          </div>
          <div className="rounded-3xl bg-white px-3 py-4 shadow-sm">
            <p className="text-xl font-semibold text-navy">
              {durationSeconds != null ? formatDuration(durationSeconds) : "—"}
            </p>
            <p className="mt-0.5 text-xs text-navy/50">duration</p>
          </div>
        </div>

        {/* Developer: the finalized JSON exactly as n8n will receive it */}
        <div className="anim-rise mt-4 w-full text-left">
          <DevPayloadSection
            payload={finalPayload}
            note='Final payload — status "Completed", completedAt and durationSeconds are set. localObjectUrl values are local previews only; file upload comes with the backend.'
          />
        </div>
      </main>

      {/* Bottom action */}
      <footer className="px-5 pb-6 pt-4">
        <button
          onClick={onDone}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-navy text-lg font-semibold text-white shadow-md shadow-navy/25 transition-all active:scale-[0.98] hover:bg-navy-deep"
        >
          Return Home
        </button>
      </footer>
    </div>
  );
}
