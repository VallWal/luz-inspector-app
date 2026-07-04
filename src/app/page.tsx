"use client";

import { useRef, useState } from "react";
import { inspector, properties, type Property } from "./data";
import {
  getInspectionConfig,
  getZonesForProperty,
} from "@/config/inspectionTypes";
import type {
  Finding,
  FindingDraft,
  InspectionSession,
  InspectionZone,
  ZoneStatus,
} from "@/types/inspection";
import HomeScreen from "./components/HomeScreen";
import SelectPropertyScreen from "./components/SelectPropertyScreen";
import SelectTypeScreen from "./components/SelectTypeScreen";
import InspectionStartScreen from "./components/InspectionStartScreen";
import InspectionScreen from "./components/InspectionScreen";
import SummaryScreen from "./components/SummaryScreen";
import CompleteScreen from "./components/CompleteScreen";

// ---- Navigation ------------------------------------------------------------

type Screen =
  | { name: "home" }
  | { name: "selectProperty" }
  | { name: "selectType"; propertyId: string }
  | { name: "starting" }
  | { name: "inspection" }
  | { name: "summary" }
  | { name: "complete" };

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

/**
 * TEMP debug flag: shows a tap counter badge to verify touch events reach
 * React on real devices. If the badge stays at 0 on a phone, JS/hydration
 * failed (check Safari console) — that's the bug, not CSS/overlays.
 * Set to false (or remove) once mobile touch is verified.
 */
const DEBUG_TOUCH = true;

// ---- App -------------------------------------------------------------------

export default function App() {
  const [layers, setLayers] = useState<Layer[]>([
    { key: 0, screen: { name: "home" }, anim: null },
  ]);
  const nextKey = useRef(1);
  const animating = useRef(false);

  // Inspection session (one active inspection at a time, React state only)
  const [session, setSession] = useState<InspectionSession | null>(null);
  const [zoneStatuses, setZoneStatuses] = useState<ZoneStatus[]>([]);
  const [zoneIndex, setZoneIndex] = useState(0);
  const [findings, setFindings] = useState<Finding[]>([]);
  const inspectionSeq = useRef(0);

  // Duration tracking
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [zoneStartedAt, setZoneStartedAt] = useState<number | null>(null);
  const [zoneDurations, setZoneDurations] = useState<number[]>([]);
  const [summaryElapsedSec, setSummaryElapsedSec] = useState<number | null>(
    null
  );

  // TEMP: debug tap counter (see DEBUG_TOUCH above)
  const [tapCount, setTapCount] = useState(0);

  const nowMs = () => new Date().getTime();

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
    properties.find((p) => p.id === id) ?? properties[0];

  /** Zones come from the session's inspection type config + property features. */
  const zonesForSession = (s: InspectionSession): InspectionZone[] =>
    getZonesForProperty(
      getInspectionConfig(s.inspectionType),
      getProperty(s.propertyId).features
    );

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
    inspectionSeq.current += 1;
    const start = nowMs();
    const newSession: InspectionSession = {
      inspectionId: `insp-${property.id}-${inspectionSeq.current}`,
      propertyId: property.id,
      propertyName: property.name,
      inspectionType,
      inspector,
      startedAt: start,
      status: "In Progress",
    };
    setSession(newSession);
    setZoneStatuses(zonesForSession(newSession).map(() => "pending"));
    setZoneIndex(0);
    setFindings([]);
    setCompletedAt(null);
    setDurationSeconds(null);
    setSummaryElapsedSec(null);
    setZoneStartedAt(start);
    setZoneDurations(zonesForSession(newSession).map(() => 0));
    // Short branded transition screen, then fade into the first zone
    navigate({ name: "starting" }, "fwd");
    window.setTimeout(() => {
      navigate({ name: "inspection" }, "fade");
    }, 1100);
  };

  const confirmZone = () => {
    closeZoneTiming();
    setZoneStatuses((prev) =>
      prev.map((s, i) => (i === zoneIndex ? "confirmed" : s))
    );
  };

  const saveFinding = (draft: FindingDraft) => {
    if (!session) return;
    closeZoneTiming();
    const zone = zonesForSession(session)[zoneIndex];
    setZoneStatuses((prev) =>
      prev.map((s, i) => (i === zoneIndex ? "issue" : s))
    );
    setFindings((prev) => [
      ...prev,
      {
        ...draft,
        inspectionId: session.inspectionId,
        propertyId: session.propertyId,
        zone: zone.id,
        timestamp: new Date().toISOString(),
      },
    ]);
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
          />
        );
      case "selectProperty":
        return (
          <SelectPropertyScreen
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
        return (
          <InspectionScreen
            property={property}
            inspectionType={session.inspectionType}
            zones={zonesForSession(session)}
            zoneIndex={zoneIndex}
            zoneStatuses={zoneStatuses}
            onConfirmZone={confirmZone}
            onSaveFinding={saveFinding}
            onNextZone={() => {
              setZoneIndex((i) => i + 1);
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
            zones={zonesForSession(session)}
            zoneStatuses={zoneStatuses}
            findings={findings}
            elapsedSeconds={summaryElapsedSec}
            zoneDurations={zoneDurations}
            onBack={() => navigate({ name: "inspection" }, "back")}
            onComplete={() => {
              const end = nowMs();
              setCompletedAt(end);
              setDurationSeconds(Math.round((end - session.startedAt) / 1000));
              setSession({ ...session, status: "Completed" });
              navigate({ name: "complete" }, "fwd");
            }}
          />
        );
      }
      case "complete": {
        if (!session) return null;
        return (
          <CompleteScreen
            property={getProperty(session.propertyId)}
            zoneStatuses={zoneStatuses}
            findings={findings}
            durationSeconds={durationSeconds}
            completedAt={completedAt}
            onDone={() => {
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
      <div
        className="relative h-dvh w-full max-w-md overflow-hidden bg-beige"
        onPointerDownCapture={
          DEBUG_TOUCH ? () => setTapCount((c) => c + 1) : undefined
        }
      >
        {layers.map((layer) => (
          <div
            key={layer.key}
            className={`screen-layer ${layer.anim ? `anim-${layer.anim}` : ""}`}
          >
            {renderScreen(layer.screen)}
          </div>
        ))}
        {DEBUG_TOUCH && (
          <div className="pointer-events-none fixed right-2 top-2 z-[100] rounded-full bg-navy/80 px-3 py-1.5 text-xs font-semibold text-white shadow">
            {tapCount === 0 ? "Tap anywhere to test" : `Taps: ${tapCount}`}
          </div>
        )}
      </div>
    </div>
  );
}
