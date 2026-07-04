"use client";

import { useEffect, useRef, useState } from "react";
import type { Property } from "../data";
import type {
  ChecklistItem,
  FindingDraft,
  InspectionZone,
  ZoneStatus,
} from "@/types/inspection";
import { BackButton, CheckIcon } from "./icons";
import ReportFindingSheet from "./ReportFindingSheet";

const ADVANCE_DELAY_MS = 950;
const MAX_VISIBLE_OBSERVE_ITEMS = 6;

/** "Things to observe" — lightweight guidance, collapses beyond 6 items. */
function ThingsToObserve({ items }: { items: ChecklistItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const overflow = items.length > MAX_VISIBLE_OBSERVE_ITEMS;
  const visible =
    overflow && !expanded ? items.slice(0, MAX_VISIBLE_OBSERVE_ITEMS) : items;

  return (
    <div className="mt-5 flex min-h-0 flex-col">
      <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
        Things to observe
      </p>
      <ul
        className={`mt-2.5 flex flex-col gap-2 ${
          expanded ? "max-h-56 overflow-y-auto overscroll-contain pr-1" : ""
        }`}
      >
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
  onConfirmZone: () => void;
  onSaveFinding: (draft: FindingDraft) => void;
  onNextZone: () => void;
  onFinish: () => void;
  onBack: () => void;
}

export default function InspectionScreen({
  property,
  inspectionType,
  zones,
  zoneIndex,
  zoneStatuses,
  onConfirmZone,
  onSaveFinding,
  onNextZone,
  onFinish,
  onBack,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const timer = useRef<number | null>(null);

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

  const scheduleAdvance = () => {
    setAdvancing(true);
    timer.current = window.setTimeout(() => {
      setAdvancing(false);
      if (isLastZone) onFinish();
      else onNextZone();
    }, ADVANCE_DELAY_MS);
  };

  const confirmZone = () => {
    if (advancing || zoneStatus !== "pending") return;
    onConfirmZone();
    scheduleAdvance();
  };

  const saveFinding = (draft: FindingDraft) => {
    onSaveFinding(draft);
    setSheetOpen(false);
    setToast("Finding saved");
    scheduleAdvance();
  };

  return (
    <div className="flex min-h-full flex-col">
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
            {completedCount} / {zones.length} zones completed
          </p>
        </div>
      </section>

      {/* Current zone (re-animates on zone change) */}
      <main
        key={zone.id}
        className="anim-zone-in mx-5 mt-4 flex flex-1 flex-col rounded-3xl bg-white px-6 py-7 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
              Zone {zoneIndex + 1} of {zones.length}
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-navy">{zone.title}</h3>
          </div>
          {zoneStatus === "confirmed" && (
            <span className="anim-pop-fast flex items-center gap-1.5 rounded-full bg-status-green-soft px-3 py-1.5 text-sm font-medium text-status-green">
              <CheckIcon /> Completed
            </span>
          )}
          {zoneStatus === "issue" && (
            <span className="anim-pop-fast flex items-center gap-1.5 rounded-full bg-status-yellow-soft px-3 py-1.5 text-sm font-medium text-status-yellow">
              ⚠ Issue reported
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
            disabled={zoneStatus !== "pending"}
            className={`flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold shadow-md transition-all active:scale-[0.98] ${
              zoneStatus === "confirmed"
                ? "bg-status-green text-white shadow-status-green/25"
                : "bg-navy text-white shadow-navy/25 hover:bg-navy-deep disabled:opacity-40"
            }`}
          >
            <CheckIcon />{" "}
            {zoneStatus === "confirmed" ? "Zone Completed" : "Complete Zone"}
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
          <button
            onClick={() => setSheetOpen(true)}
            disabled={zoneStatus !== "pending" || advancing}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-status-red/30 bg-status-red-soft text-base font-semibold text-status-red transition-all active:scale-[0.98] hover:border-status-red/50 disabled:opacity-40"
          >
            ⚠ Report Finding
          </button>
        </div>
      </main>

      {/* Zone progress dots */}
      <footer className="flex items-center justify-center gap-2.5 px-5 pb-7 pt-5">
        {zones.map((z, i) => {
          const s = zoneStatuses[i];
          return (
            <span
              key={z.id}
              className={`rounded-full transition-all duration-300 ${
                i === zoneIndex
                  ? "h-2.5 w-7 bg-navy"
                  : s === "confirmed"
                    ? "size-2.5 bg-status-green"
                    : s === "issue"
                      ? "size-2.5 bg-status-yellow"
                      : "size-2.5 bg-navy/15"
              }`}
            />
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
