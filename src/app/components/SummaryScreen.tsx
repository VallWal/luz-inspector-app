"use client";

import { useMemo, useState } from "react";
import type { Property } from "../data";
import {
  HEALTH_CATEGORIES,
  healthFromFindings,
  type Finding,
  type InspectionSession,
  type InspectionZone,
  type ZoneStatus,
} from "@/types/inspection";
import { formatDuration } from "../lib/duration";
import { buildFinalSubmissionPayload } from "../lib/payload";
import { submitInspectionPayload } from "../lib/submission";
import { BackButton, CheckIcon } from "./icons";
import DevPayloadSection from "./DevPayloadSection";

type SubmitState = "idle" | "sending" | "success" | "error";

interface Props {
  property: Property;
  session: InspectionSession;
  zones: InspectionZone[];
  zoneStatuses: ZoneStatus[];
  findings: Finding[];
  /** Open findings from earlier inspections verified as fixed. */
  resolvedFindings: { recordId: string; findingId: string }[];
  /** Elapsed seconds so far, computed when the summary is opened. */
  elapsedSeconds: number | null;
  zoneDurations: number[];
  onBack: () => void;
  /** Called after a CONFIRMED save + "Return Home" — clears the session. */
  onFinished: () => void;
}

/**
 * Review + completion in ONE screen. "Complete Inspection" builds the final
 * payload, submits it to n8n and shows the real result: Sending… / Saved /
 * Failed with Retry. The session (and the persisted draft) are only discarded
 * after a confirmed 2xx — a failed upload never loses an inspection.
 */
export default function SummaryScreen({
  property,
  session,
  zones,
  zoneStatuses,
  findings,
  resolvedFindings,
  elapsedSeconds,
  zoneDurations,
  onBack,
  onFinished,
}: Props) {
  const confirmedCount = zoneStatuses.filter((s) => s === "confirmed").length;
  // Count actual findings, not just the number of areas that have issues.
  const issueCount = findings.length;
  const health = healthFromFindings(findings);

  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [finalDurationSec, setFinalDurationSec] = useState<number | null>(null);
  const [lastPayload, setLastPayload] = useState<ReturnType<
    typeof buildFinalSubmissionPayload
  > | null>(null);

  // Developer payload viewer — only with ?dev=1 in the URL.
  const devMode = useMemo(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("dev") === "1",
    []
  );

  const submit = async () => {
    if (submitState === "sending" || submitState === "success") return;
    setSubmitState("sending");
    // Finalized at press time: status "Completed", ISO completedAt,
    // durationSeconds derived startedAt → completedAt.
    const completedAt = Date.now();
    const payload = buildFinalSubmissionPayload({
      session,
      zones,
      zoneStatuses,
      zoneDurations,
      findings,
      resolvedFindings,
      completedAt,
    });
    setLastPayload(payload);
    setFinalDurationSec(
      Math.max(0, Math.round((completedAt - session.startedAt) / 1000))
    );
    try {
      await submitInspectionPayload(payload);
      setSubmitState("success");
    } catch (err) {
      console.error("Inspection submission failed", err);
      setSubmitState("error");
    }
  };

  // ---- Saved — confirmation state (replaces the old Complete screen) ----------
  if (submitState === "success") {
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
            Saved — findings are being processed
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
                {issueCount}
              </p>
              <p className="mt-0.5 text-xs text-navy/50">findings</p>
            </div>
            <div className="rounded-3xl bg-white px-3 py-4 shadow-sm">
              <p className="text-xl font-semibold text-navy">
                {finalDurationSec != null
                  ? formatDuration(finalDurationSec)
                  : "—"}
              </p>
              <p className="mt-0.5 text-xs text-navy/50">duration</p>
            </div>
          </div>

          {devMode && lastPayload && (
            <div className="anim-rise mt-4 w-full text-left">
              <DevPayloadSection
                payload={lastPayload}
                note="Final payload as submitted to n8n."
              />
            </div>
          )}
        </main>

        <footer className="px-5 pb-6 pt-4">
          <button
            onClick={onFinished}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-navy text-lg font-semibold text-white shadow-md shadow-navy/25 transition-all active:scale-[0.98] hover:bg-navy-deep"
          >
            Return Home
          </button>
        </footer>
      </div>
    );
  }

  // ---- Review state ------------------------------------------------------------
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
            <p className="text-xs text-white/60">findings</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{zones.length}</p>
            <p className="text-xs text-white/60">areas</p>
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

      {/* Areas review */}
      <main className="mx-5 mt-4 flex flex-1 flex-col gap-3 pb-2">
        <section className="rounded-3xl bg-white px-6 py-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
            Areas
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
                    ) : status === "not_applicable" ? (
                      <span className="text-sm font-medium text-navy/40">
                        – Not Applicable
                      </span>
                    ) : (
                      <span className="text-sm text-navy/40">Skipped</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {resolvedFindings.length > 0 && (
            <p className="mt-3 border-t border-navy/5 pt-3 text-sm font-medium text-status-green">
              ✓ {resolvedFindings.length} open finding
              {resolvedFindings.length === 1 ? "" : "s"} verified as fixed
            </p>
          )}
        </section>

        {/* Property health preview */}
        <section className="rounded-3xl bg-white px-6 py-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
            Property Health Preview
          </p>
          <ul className="mt-3 flex flex-col">
            {HEALTH_CATEGORIES.map((dimension, i) => {
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
                          : "Auto (voice)"}
                      </span>
                    </div>
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
      </main>

      {/* Submission failed */}
      {submitState === "error" && (
        <div className="mx-5 mb-2 rounded-2xl border-2 border-status-red/30 bg-status-red-soft px-4 py-3">
          <p className="text-sm font-semibold text-status-red">
            ⚠ Could not save the inspection
          </p>
          <p className="mt-0.5 text-xs text-navy/60">
            Nothing is lost — your inspection stays on this device. Check the
            connection and try again.
          </p>
        </div>
      )}

      {/* Bottom action */}
      <footer className="px-5 pb-6 pt-2">
        <button
          onClick={submit}
          disabled={submitState === "sending"}
          className={`flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-60 ${
            submitState === "error"
              ? "bg-status-red shadow-status-red/25"
              : "bg-status-green shadow-status-green/25"
          }`}
        >
          {submitState === "sending" ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving inspection…
            </>
          ) : submitState === "error" ? (
            <>↻ Retry Save</>
          ) : (
            <>
              <CheckIcon /> Complete Inspection
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
