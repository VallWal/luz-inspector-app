"use client";

import { useMemo } from "react";
import type { Property } from "../data";
import {
  HEALTH_DIMENSIONS,
  healthFromFindings,
  type Finding,
  type InspectionSession,
  type InspectionZone,
  type ZoneStatus,
} from "@/types/inspection";
import { formatDuration } from "../lib/duration";
import { buildSubmissionPayload } from "../lib/payload";
import { BackButton, CheckIcon } from "./icons";
import DevPayloadSection from "./DevPayloadSection";

interface Props {
  property: Property;
  session: InspectionSession;
  zones: InspectionZone[];
  zoneStatuses: ZoneStatus[];
  findings: Finding[];
  /** Elapsed seconds so far, computed when the summary is opened. */
  elapsedSeconds: number | null;
  zoneDurations: number[];
  onBack: () => void;
  onComplete: () => void;
}

export default function SummaryScreen({
  property,
  session,
  zones,
  zoneStatuses,
  findings,
  elapsedSeconds,
  zoneDurations,
  onBack,
  onComplete,
}: Props) {
  const confirmedCount = zoneStatuses.filter((s) => s === "confirmed").length;
  const issueCount = zoneStatuses.filter((s) => s === "issue").length;
  const health = healthFromFindings(findings);

  // Debug preview while the inspection is still open — status stays
  // "In Progress" here; the final payload is built on Complete Inspection.
  const previewPayload = useMemo(
    () =>
      buildSubmissionPayload({
        session,
        zones,
        zoneStatuses,
        zoneDurations,
        findings,
        completedAt: null,
        durationSeconds: elapsedSeconds,
      }),
    [session, zones, zoneStatuses, zoneDurations, findings, elapsedSeconds]
  );

  return (
    <div className="flex min-h-full flex-col">
      {/* Top navigation */}
      <header className="flex items-center gap-3 px-5 pt-5 pb-2">
        <BackButton onClick={onBack} />
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
            Inspection
          </p>
          <h1 className="text-base font-semibold text-navy">Summary</h1>
        </div>
      </header>

      {/* Property card */}
      <section className="mx-5 mt-3 rounded-3xl bg-navy px-6 py-5 text-white shadow-lg shadow-navy/20">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">{property.name}</h2>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide">
            {property.code}
          </span>
        </div>
        <div className="mt-4 flex gap-6">
          <div>
            <p className="text-2xl font-semibold text-status-green">
              {confirmedCount}
            </p>
            <p className="text-xs text-white/60">confirmed</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-status-yellow">
              {issueCount}
            </p>
            <p className="text-xs text-white/60">issues</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{zones.length}</p>
            <p className="text-xs text-white/60">zones</p>
          </div>
          {elapsedSeconds != null && (
            <div>
              <p className="text-2xl font-semibold">
                {formatDuration(elapsedSeconds)}
              </p>
              <p className="text-xs text-white/60">duration</p>
            </div>
          )}
        </div>
      </section>

      {/* Zones review */}
      <main className="mx-5 mt-4 flex flex-1 flex-col gap-3 pb-2">
        <section className="rounded-3xl bg-white px-6 py-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
            Zones
          </p>
          <ul className="mt-3 flex flex-col">
            {zones.map((zone, i) => {
              const status = zoneStatuses[i];
              return (
                <li
                  key={zone.id}
                  className={`flex items-center justify-between py-2.5 ${
                    i > 0 ? "border-t border-navy/5" : ""
                  }`}
                >
                  <span className="text-sm font-medium text-navy">
                    {zone.title}
                  </span>
                  <span className="flex items-center gap-2.5">
                    {zoneDurations[i] > 0 && (
                      <span className="text-xs text-navy/40">
                        {formatDuration(zoneDurations[i])}
                      </span>
                    )}
                    {status === "confirmed" ? (
                      <span className="flex items-center gap-1 text-sm font-medium text-status-green">
                        <CheckIcon size={16} /> OK
                      </span>
                    ) : status === "issue" ? (
                      <span className="text-sm font-medium text-status-yellow">
                        ⚠ Issue
                      </span>
                    ) : (
                      <span className="text-sm text-navy/40">Skipped</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Property health preview */}
        <section className="rounded-3xl bg-white px-6 py-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
            Property Health Preview
          </p>
          <ul className="mt-3 flex flex-col">
            {HEALTH_DIMENSIONS.map((dimension, i) => {
              const status = health[dimension];
              return (
                <li
                  key={dimension}
                  className={`flex items-center justify-between py-2.5 ${
                    i > 0 ? "border-t border-navy/5" : ""
                  }`}
                >
                  <span className="text-sm font-medium text-navy">{dimension}</span>
                  {status === "good" ? (
                    <span className="flex items-center gap-2 text-sm font-medium text-status-green">
                      <span className="size-2.5 rounded-full bg-status-green" />
                      Good
                    </span>
                  ) : status === "monitor" ? (
                    <span className="flex items-center gap-2 text-sm font-medium text-status-yellow">
                      <span className="size-2.5 rounded-full bg-status-yellow" />
                      Monitor
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-sm font-medium text-status-red">
                      <span className="size-2.5 rounded-full bg-status-red" />
                      Action needed
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {findings.length > 0 && (
          <section className="rounded-3xl bg-white px-6 py-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
              Findings
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {findings.map((finding, i) => {
                const zoneTitle =
                  zones.find((z) => z.id === finding.zone)?.title ??
                  finding.zone;
                return (
                  <li
                    key={i}
                    className={`rounded-2xl px-4 py-3 ${
                      finding.severity === "immediate"
                        ? "bg-status-red-soft"
                        : "bg-status-yellow-soft"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-navy">
                        {zoneTitle}
                      </span>
                      <span
                        className={`text-xs font-semibold uppercase tracking-wide ${
                          finding.severity === "immediate"
                            ? "text-status-red"
                            : "text-status-yellow"
                        }`}
                      >
                        {finding.severity === "immediate"
                          ? "Immediate"
                          : "Monitor"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-navy/50">
                      {finding.healthDimension}
                    </p>
                    {(finding.photos.length > 0 || finding.voiceRecording) && (
                      <p className="mt-1 text-xs font-medium text-navy/60">
                        {finding.photos.length > 0 &&
                          `📷 ${finding.photos.length} photo${
                            finding.photos.length > 1 ? "s" : ""
                          }`}
                        {finding.photos.length > 0 &&
                          finding.voiceRecording &&
                          " · "}
                        {finding.voiceRecording &&
                          `🎤 ${Math.floor(
                            finding.voiceRecording.durationSec / 60
                          )}:${String(
                            finding.voiceRecording.durationSec % 60
                          ).padStart(2, "0")}`}
                      </p>
                    )}
                    {finding.optionalNote && (
                      <p className="mt-1 text-sm text-navy/70">
                        {finding.optionalNote}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Developer: debug preview of the n8n submission JSON */}
        <DevPayloadSection
          payload={previewPayload}
          note='Debug preview — status stays "In Progress" with completedAt: null until Complete Inspection is tapped.'
        />
      </main>

      {/* Bottom action */}
      <footer className="px-5 pb-6 pt-4">
        <button
          onClick={onComplete}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-status-green text-lg font-semibold text-white shadow-md shadow-status-green/25 transition-all active:scale-[0.98]"
        >
          <CheckIcon /> Complete Inspection
        </button>
      </footer>
    </div>
  );
}
