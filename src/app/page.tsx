"use client";

import { useEffect, useRef, useState } from "react";
import {
  inspector,
  setLiveInspectionItems,
  setLiveNotes,
  setLiveOpenFindings,
  type Property,
} from "./data";
import { fetchAppData } from "./lib/appData";

/** Safety fallback only — inspections can only start from a fetched property. */
const UNKNOWN_PROPERTY: Property = {
  id: "",
  name: "Unknown property",
  code: "",
  kind: "",
  address: "",
  lastInspection: "",
  accessNotes: "",
  features: [],
};
import { zonesForInspection } from "@/config/inspectionTypes";
import type {
  Finding,
  FindingDraft,
  InspectionSession,
  InspectionZone,
  ZoneStatus,
} from "@/types/inspection";
import { clearDraft, loadDraft, saveDraft } from "./lib/draftStore";
import HomeScreen from "./components/HomeScreen";
import RecordEventScreen from "./components/RecordEventScreen";
import SelectPropertyScreen from "./components/SelectPropertyScreen";
import SelectTypeScreen from "./components/SelectTypeScreen";
import InspectionStartScreen from "./components/InspectionStartScreen";
import InspectionScreen from "./components/InspectionScreen";
import SummaryScreen from "./components/SummaryScreen";

// ---- Navigation ------------------------------------------------------------

type Screen =
  | { name: "home" }
  | { name: "recordEvent" }
  | { name: "selectProperty" }
  | { name: "selectType"; propertyId: string }
  | { name: "starting" }
  | { name: "inspection" }
  | { name: "summary" };

type Anim =
  | "in-fwd"
  | "out-fwd"
  | "in-back"
  | "out-back"
  | "in-fade"
  | "out-fade"
  | null;

interface Layer {
  key: number;
  screen: Screen;
  anim: Anim;
}

const TRANSITION_MS = 340;

// ---- App -------------------------------------------------------------------

export default function App() {
  const [layers, setLayers] = useState<Layer[]>([
    { key: 0, screen: { name: "home" }, anim: null },
  ]);
  const nextKey = useRef(1);
  const animating = useRef(false);

  // Properties — always live from Airtable (via n8n). No hardcoded fallback:
  // null = still loading, [] = fetch failed or no active properties.
  const [propertyList, setPropertyList] = useState<Property[] | null>(null);
  const [itemsLoaded, setItemsLoaded] = useState(false);

  // Inspection session (one active inspection at a time). Persisted to
  // IndexedDB after every change so a reload/crash never loses work.
  const [session, setSession] = useState<InspectionSession | null>(null);
  const [zoneStatuses, setZoneStatuses] = useState<ZoneStatus[]>([]);
  const [zoneIndex, setZoneIndex] = useState(0);
  const [findings, setFindings] = useState<Finding[]>([]);
  const inspectionSeq = useRef(0);
  /** Per-inspection counter so findingIds stay stable regardless of array order. */
  const findingSeq = useRef(0);

  // Duration tracking
  const [zoneStartedAt, setZoneStartedAt] = useState<number | null>(null);
  const [zoneDurations, setZoneDurations] = useState<number[]>([]);
  const [summaryElapsedSec, setSummaryElapsedSec] = useState<number | null>(
    null
  );

  const nowMs = () => new Date().getTime();

  // App data fetch + draft restore. The draft is only restored AFTER the
  // inspection items are loaded — the flow's zones are built from them.
  useEffect(() => {
    fetchAppData()
      .then(async (data) => {
        setPropertyList(data.properties);
        if (data.notes.length > 0) setLiveNotes(data.notes);
        setLiveInspectionItems(data.inspectionItems);
        setLiveOpenFindings(data.openFindings);
        setItemsLoaded(data.inspectionItems.length > 0);
        // Restore an interrupted inspection (reload, crash, phone lock).
        const draft = await loadDraft();
        if (draft && data.inspectionItems.length > 0) {
          setSession(draft.session);
          setZoneStatuses(draft.zoneStatuses);
          setZoneIndex(draft.zoneIndex);
          setZoneDurations(draft.zoneDurations);
          setFindings(draft.findings);
          findingSeq.current = draft.findings.length;
          setZoneStartedAt(nowMs());
        }
      })
      .catch((err) => {
        console.error("App data fetch failed", err);
        setPropertyList([]);
      });
  }, []);

  // Persist the in-progress inspection on every change (best-effort).
  useEffect(() => {
    if (!session || session.status !== "In Progress") return;
    saveDraft({ session, zoneStatuses, zoneIndex, zoneDurations, findings });
  }, [session, zoneStatuses, zoneIndex, zoneDurations, findings]);

  const navigate = (screen: Screen, dir: "fwd" | "back" | "fade") => {
    if (animating.current) return;
    animating.current = true;
    setLayers((prev) => {
      const current = prev[prev.length - 1];
      return [
        {
          ...current,
          anim:
            dir === "fwd" ? "out-fwd" : dir === "back" ? "out-back" : "out-fade",
        },
        {
          key: nextKey.current++,
          screen,
          anim: dir === "fwd" ? "in-fwd" : dir === "back" ? "in-back" : "in-fade",
        },
      ];
    });
    window.setTimeout(() => {
      setLayers((prev) => [{ ...prev[prev.length - 1], anim: null }]);
      animating.current = false;
    }, TRANSITION_MS);
  };

  const getProperty = (id: string): Property =>
    (propertyList ?? []).find((p) => p.id === id) ?? UNKNOWN_PROPERTY;

  /** Category steps from the Airtable inspection items for this type. */
  const zonesForSession = (s: InspectionSession): InspectionZone[] =>
    zonesForInspection(s.inspectionType);

  /** Close the timing of the current zone (first completion or finding wins). */
  const closeZoneTiming = () => {
    if (zoneStartedAt == null) return;
    const secs = Math.max(1, Math.round((nowMs() - zoneStartedAt) / 1000));
    setZoneDurations((prev) =>
      prev.map((d, i) => (i === zoneIndex && d === 0 ? secs : d))
    );
  };

  // ---- Flow actions --------------------------------------------------------

  const startInspection = (property: Property, inspectionType: string) => {
    // Items come from Airtable — never start with an empty flow.
    if (zonesForInspection(inspectionType).length === 0) {
      console.warn("No inspection items loaded for", inspectionType);
      return;
    }
    inspectionSeq.current += 1;
    const start = nowMs();
    const newSession: InspectionSession = {
      // startedAt makes the id unique even across app reloads (n8n also
      // dedupes on this id before creating records).
      inspectionId: `insp-${property.id}-${start}-${inspectionSeq.current}`,
      propertyId: property.id,
      propertyName: property.name,
      inspectionType,
      inspector,
      startedAt: start,
      status: "In Progress",
    };
    // Starting a new inspection replaces any previous draft.
    clearDraft();
    setSession(newSession);
    setZoneStatuses(zonesForSession(newSession).map(() => "pending"));
    setZoneIndex(0);
    setFindings([]);
    findingSeq.current = 0;
    setSummaryElapsedSec(null);
    setZoneStartedAt(start);
    setZoneDurations(zonesForSession(newSession).map(() => 0));
    // Short branded transition screen, then fade into the first zone
    navigate({ name: "starting" }, "fwd");
    window.setTimeout(() => {
      navigate({ name: "inspection" }, "fade");
    }, 1100);
  };

  /** Complete Area: an area with findings keeps its "issue" status.
      A revisited not_applicable area can be changed to confirmed. */
  const confirmZone = () => {
    closeZoneTiming();
    setZoneStatuses((prev) =>
      prev.map((s, i) =>
        i === zoneIndex && (s === "pending" || s === "not_applicable")
          ? "confirmed"
          : s
      )
    );
  };

  /** Not Applicable: intentionally skipped, counts as completed, no finding. */
  const markZoneNotApplicable = () => {
    closeZoneTiming();
    setZoneStatuses((prev) =>
      prev.map((s, i) => (i === zoneIndex ? "not_applicable" : s))
    );
  };

  const saveFinding = (draft: FindingDraft) => {
    if (!session) return;
    closeZoneTiming();
    const zone = zonesForSession(session)[zoneIndex];
    findingSeq.current += 1;
    const findingId = `fnd-${session.inspectionId}-${String(
      findingSeq.current
    ).padStart(3, "0")}`;
    setZoneStatuses((prev) =>
      prev.map((s, i) => (i === zoneIndex ? "issue" : s))
    );
    const finding: Finding = {
      ...draft,
      findingId,
      inspectionId: session.inspectionId,
      propertyId: session.propertyId,
      zone: zone.id,
      healthCategory: zone.title,
      timestamp: new Date().toISOString(),
    };
    setFindings((prev) => [...prev, finding]);
  };

  // ---- Screen rendering ----------------------------------------------------

  const renderScreen = (screen: Screen) => {
    switch (screen.name) {
      case "home":
        return (
          <HomeScreen
            session={session?.status === "In Progress" ? session : null}
            onResume={() => navigate({ name: "inspection" }, "fwd")}
            onStartNew={() => navigate({ name: "selectProperty" }, "fwd")}
            onRecordEvent={() => navigate({ name: "recordEvent" }, "fwd")}
          />
        );
      case "recordEvent":
        return (
          <RecordEventScreen
            properties={propertyList ?? []}
            propertiesLoading={propertyList === null}
            onBack={() => navigate({ name: "home" }, "back")}
            onDone={() => navigate({ name: "home" }, "fwd")}
          />
        );
      case "selectProperty":
        return (
          <SelectPropertyScreen
            properties={propertyList ?? []}
            propertiesLoading={propertyList === null}
            onBack={() => navigate({ name: "home" }, "back")}
            onSelect={(property) =>
              navigate(
                { name: "selectType", propertyId: property.id },
                "fwd"
              )
            }
          />
        );
      case "selectType": {
        const property = getProperty(screen.propertyId);
        return (
          <SelectTypeScreen
            property={property}
            itemsLoaded={itemsLoaded}
            onBack={() => navigate({ name: "selectProperty" }, "back")}
            onStart={(inspectionType) =>
              startInspection(property, inspectionType)
            }
          />
        );
      }
      case "starting": {
        if (!session) return null;
        return (
          <InspectionStartScreen
            property={getProperty(session.propertyId)}
            inspectionType={session.inspectionType}
            startedAt={session.startedAt}
          />
        );
      }
      case "inspection": {
        if (!session) return null;
        const property = getProperty(session.propertyId);
        const zones = zonesForSession(session);
        const currentZoneId = zones[zoneIndex]?.id;
        return (
          <InspectionScreen
            property={property}
            inspectionType={session.inspectionType}
            zones={zones}
            zoneIndex={zoneIndex}
            zoneStatuses={zoneStatuses}
            zoneFindingCount={
              findings.filter((f) => f.zone === currentZoneId).length
            }
            findings={findings}
            onConfirmZone={confirmZone}
            onMarkNotApplicable={markZoneNotApplicable}
            onSaveFinding={saveFinding}
            onNextZone={() => {
              setZoneIndex((i) => i + 1);
              setZoneStartedAt(nowMs());
            }}
            onGoToZone={(i) => {
              // Free navigation between areas — never touches existing
              // findings or completed statuses.
              setZoneIndex(i);
              setZoneStartedAt(nowMs());
            }}
            onFinish={() => {
              setSummaryElapsedSec(
                Math.round((nowMs() - session.startedAt) / 1000)
              );
              navigate({ name: "summary" }, "fwd");
            }}
            onBack={() => navigate({ name: "home" }, "back")}
          />
        );
      }
      case "summary": {
        if (!session) return null;
        return (
          <SummaryScreen
            property={getProperty(session.propertyId)}
            session={session}
            zones={zonesForSession(session)}
            zoneStatuses={zoneStatuses}
            findings={findings}
            elapsedSeconds={summaryElapsedSec}
            zoneDurations={zoneDurations}
            onBack={() => navigate({ name: "inspection" }, "back")}
            // Called only after a CONFIRMED (2xx) save — the summary screen
            // owns submission and retry; a failed upload never loses work.
            onFinished={() => {
              clearDraft();
              setSession(null);
              navigate({ name: "home" }, "fwd");
            }}
          />
        );
      }
    }
  };

  return (
    <div className="flex flex-1 justify-center">
      {/* Phone-width column, centered on desktop */}
      <div className="relative h-dvh w-full max-w-md overflow-hidden bg-beige">
        {layers.map((layer) => (
          <div
            key={layer.key}
            className={`screen-layer ${layer.anim ? `anim-${layer.anim}` : ""}`}
          >
            {renderScreen(layer.screen)}
          </div>
        ))}
      </div>
    </div>
  );
}
