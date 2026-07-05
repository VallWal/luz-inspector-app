"use client";

import { useEffect, useRef, useState } from "react";
import type { Property } from "../data";
import type {
  ChecklistItem,
  Finding,
  FindingDraft,
  InspectionZone,
  ZoneStatus,
} from "@/types/inspection";
import { BackButton, CheckIcon } from "./icons";
import ReportFindingSheet from "./ReportFindingSheet";

const ADVANCE_DELAY_MS = 950;
const MAX_VISIBLE_OBSERVE_ITEMS = 6;

/**
 * "Things to observe" — lightweight guidance, collapses beyond 6 items.
 * "Show more" expands the card fully (no internal scroll area).
 */
function ThingsToObserve({ items }: { items: ChecklistItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const overflow = items.length > MAX_VISIBLE_OBSERVE_ITEMS;
  const visible =
    overflow && !expanded ? items.slice(0, MAX_VISIBLE_OBSERVE_ITEMS) : items;

  return (
    <div className="mt-5 flex flex-col">
      <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
        Things to observe
      </p>
      <ul className="mt-2.5 flex flex-col gap-2">
        {visible.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-2.5 text-sm leading-snug text-navy/70"
          >
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-navy/25" />
            {item.label}
          </li>
        ))}
      </ul>
      {overflow && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="-mb-2 flex min-h-11 items-center self-start pr-3 text-sm font-semibold text-navy/60 transition-colors hover:text-navy"
        >
          {expanded
            ? "Show less"
            : `Show ${items.length - MAX_VISIBLE_OBSERVE_ITEMS} more`}
        </button>
      )}
    </div>
  );
}

interface Props {
  property: Property;
  /** From the inspection session (selected at start), not the property. */
  inspectionType: string;
  zones: InspectionZone[];
  zoneIndex: number;
  zoneStatuses: ZoneStatus[];
  /** Findings recorded in the current zone (a zone can have several). */
  zoneFindingCount: number;
  /** All findings of the session — used to color the area progress dots. */
  findings: Finding[];
  onConfirmZone: () => void;
  onMarkNotApplicable: () => void;
  onSaveFinding: (draft: FindingDraft) => void;
  onNextZone: () => void;
  /** Jump to any area via the progress dots (state is preserved). */
  onGoToZone: (index: number) => void;
  onFinish: () => void;
  onBack: () => void;
}

export default function InspectionScreen({
  property,
  inspectionType,
  zones,
  zoneIndex,
  zoneStatuses,
  zoneFindingCount,
  findings,
  onConfirmZone,
  onMarkNotApplicable,
  onSaveFinding,
  onNextZone,
  onGoToZone,
  onFinish,
  onBack,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  /** Direction of the last area change — picks the slide animation. */
  const [navDir, setNavDir] = useState<"fwd" | "back">("fwd");
  const timer = useRef<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  // Clean up pending auto-advance on unmount
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  const zone = zones[zoneIndex];
  const zoneStatus = zoneStatuses[zoneIndex];
  const completedCount = zoneStatuses.filter((s) => s !== "pending").length;
  const progressPct = (completedCount / zones.length) * 100;
  const isLastZone = zoneIndex === zones.length - 1;

  /** Worst finding severity in an area: immediate > monitor > none. */
  const worstSeverity = (zoneId: string): "immediate" | "monitor" | null => {
    const zf = findings.filter((f) => f.zone === zoneId);
    if (zf.some((f) => f.severity === "immediate")) return "immediate";
    if (zf.some((f) => f.severity === "monitor")) return "monitor";
    return null;
  };

  const scheduleAdvance = () => {
    setAdvancing(true);
    setNavDir("fwd");
    timer.current = window.setTimeout(() => {
      setAdvancing(false);
      if (isLastZone) onFinish();
      else onNextZone();
    }, ADVANCE_DELAY_MS);
  };

  /** Dot tap / swipe navigation — free movement, state is preserved. */
  const jumpTo = (index: number) => {
    if (advancing || index === zoneIndex) return;
    if (index < 0 || index >= zones.length) return;
    setNavDir(index > zoneIndex ? "fwd" : "back");
    onGoToZone(index);
  };

  // Swipe left = next area, swipe right = previous. Disabled while the
  // Report Finding sheet is open (covers photo picker + voice recording,
  // which live inside the sheet) and during the Complete Area advance.
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || sheetOpen || advancing) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    // Horizontal intent only — never hijack vertical scrolling.
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    jumpTo(dx < 0 ? zoneIndex + 1 : zoneIndex - 1);
  };

  // Complete Zone is the only way to advance — also for zones with findings.
  const confirmZone = () => {
    if (advancing || zoneStatus === "confirmed") return;
    onConfirmZone();
    scheduleAdvance();
  };

  // Saving a finding stays in the same zone so more findings can be added.
  const saveFinding = (draft: FindingDraft) => {
    onSaveFinding(draft);
    setSheetOpen(false);
    setToast("Finding saved");
  };

  return (
    <div
      className="flex min-h-full flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top navigation */}
      <header className="flex items-center gap-3 px-5 pt-5 pb-2">
        <BackButton onClick={onBack} />
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
            Inspection
          </p>
          <h1 className="text-base font-semibold text-navy">
            {inspectionType}
          </h1>
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
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-status-green transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-white/70">
            {completedCount} / {zones.length} areas completed
          </p>
        </div>
      </section>

      {/* Current area (re-animates on change, direction-aware slide) */}
      <main
        key={zone.id}
        className={`${
          navDir === "fwd" ? "anim-zone-in" : "anim-zone-in-back"
        } mx-5 mt-4 flex flex-1 flex-col rounded-3xl bg-white px-6 py-7 shadow-sm`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
              Area {zoneIndex + 1} of {zones.length}
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-navy">{zone.title}</h3>
          </div>
          {zoneStatus === "confirmed" && (
            <span className="anim-pop-fast flex items-center gap-1.5 rounded-full bg-status-green-soft px-3 py-1.5 text-sm font-medium text-status-green">
              <CheckIcon /> Completed
            </span>
          )}
          {zoneStatus === "issue" && (
            <span
              key={zoneFindingCount}
              className="anim-pop-fast flex shrink-0 items-center gap-1.5 rounded-full bg-status-yellow-soft px-3 py-1.5 text-sm font-medium text-status-yellow"
            >
              ⚠ {zoneFindingCount} finding{zoneFindingCount === 1 ? "" : "s"}{" "}
              recorded
            </span>
          )}
          {zoneStatus === "not_applicable" && (
            <span className="anim-pop-fast flex shrink-0 items-center gap-1.5 rounded-full bg-navy/10 px-3 py-1.5 text-sm font-medium text-navy/50">
              – Not Applicable
            </span>
          )}
        </div>

        <p className="mt-3 text-sm leading-relaxed text-navy/60">{zone.reminder}</p>

        {/* Things to observe (lightweight guidance, not tick boxes) */}
        <ThingsToObserve key={zone.id} items={zone.checklist} />

        <div className="mt-auto pt-8">
          {/* Primary action */}
          <button
            onClick={confirmZone}
            disabled={advancing || zoneStatus === "confirmed"}
            className={`flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold shadow-md transition-all active:scale-[0.98] ${
              zoneStatus === "confirmed" || (advancing && zoneStatus === "issue")
                ? "bg-status-green text-white shadow-status-green/25"
                : "bg-navy text-white shadow-navy/25 hover:bg-navy-deep disabled:opacity-40"
            }`}
          >
            <CheckIcon />{" "}
            {zoneStatus === "confirmed" ? "Area Completed" : "Complete Area"}
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-navy/10" />
            <span className="text-xs font-medium uppercase tracking-wider text-navy/40">
              or
            </span>
            <div className="h-px flex-1 bg-navy/10" />
          </div>

          {/* Secondary action */}
          {/* Findings can be added to any area, including completed ones
              revisited via the progress dots. */}
          <button
            onClick={() => setSheetOpen(true)}
            disabled={advancing}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-status-red/30 bg-status-red-soft text-base font-semibold text-status-red transition-all active:scale-[0.98] hover:border-status-red/50 disabled:opacity-40"
          >
            ⚠ {zoneFindingCount > 0 ? "Report Another Finding" : "Report Finding"}
          </button>

          {/* Tertiary action: intentionally skip this area. Counts as
              completed, creates no finding. Hidden once findings exist. */}
          {zoneFindingCount === 0 && (
            <button
              onClick={() => {
                if (advancing || zoneStatus === "not_applicable") return;
                onMarkNotApplicable();
                scheduleAdvance();
              }}
              disabled={advancing || zoneStatus === "not_applicable"}
              className="mt-3 flex min-h-11 w-full items-center justify-center text-sm font-semibold text-navy/45 transition-colors hover:text-navy/70 disabled:opacity-50"
            >
              {zoneStatus === "not_applicable"
                ? "– Marked Not Applicable"
                : "Not Applicable"}
            </button>
          )}
        </div>
      </main>

      {/* Area progress dots — tappable, colored by worst finding severity:
          immediate (red) > monitor (yellow) > completed clean (green) >
          not visited (grey). Current area = navy highlight. */}
      <footer className="flex items-center justify-center px-5 pb-4 pt-2">
        {zones.map((z, i) => {
          const s = zoneStatuses[i];
          const sev = worstSeverity(z.id);
          // Priority: immediate > monitor > confirmed > not_applicable > pending
          const dot =
            i === zoneIndex
              ? "h-2.5 w-7 bg-navy"
              : sev === "immediate"
                ? "size-2.5 bg-status-red"
                : sev === "monitor"
                  ? "size-2.5 bg-status-yellow"
                  : s === "not_applicable"
                    ? "h-[3px] w-3 bg-navy/30" // grey dash
                    : s !== "pending"
                      ? "size-2.5 bg-status-green"
                      : "size-2.5 bg-navy/15";
          return (
            <button
              key={z.id}
              aria-label={`Go to area ${i + 1}: ${z.title}`}
              aria-current={i === zoneIndex ? "step" : undefined}
              onClick={() => jumpTo(i)}
              className="flex min-h-11 min-w-6 items-center justify-center"
            >
              <span
                className={`rounded-full transition-all duration-300 ${dot}`}
              />
            </button>
          );
        })}
      </footer>

      {/* Toast (fixed to viewport so it never scrolls under content) */}
      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2">
          <div className="anim-pop-fast flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-medium text-white shadow-lg">
            <CheckIcon /> {toast}
          </div>
        </div>
      )}

      {/* Report Finding bottom sheet */}
      {sheetOpen && (
        <ReportFindingSheet
          zone={zone}
          onClose={() => setSheetOpen(false)}
          onSave={saveFinding}
        />
      )}
    </div>
  );
}
