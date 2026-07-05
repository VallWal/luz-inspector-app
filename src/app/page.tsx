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
import { buildFinalSubmissionPayload } from "./lib/payload";
import { submitInspectionPayload } from "./lib/submission";
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
  /** Per-inspection counter so findingIds stay stable regardless of array order. */
  const findingSeq = useRef(0);

  // Duration tracking
  const [completedAt, setCompletedAt] = useState<number | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [zoneStartedAt, setZoneStartedAt] = useState<number | null>(null);
  const [zoneDurations, setZoneDurations] = useState<number[]>([]);
  const [summaryElapsedSec, setSummaryElapsedSec] = useState<number | null>(
    null
  );

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
    findingSeq.current = 0;
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

  /** Complete Zone: a zone with findings keeps its "issue" status. */
  const confirmZone = () => {
    closeZoneTiming();
    setZoneStatuses((prev) =>
      prev.map((s, i) => (i === zoneIndex && s === "pending" ? "confirmed" : s))
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
      timestamp: new Date().toISOString(),
    };
    // Debug: verify photos/voice survive the sheet → findings hand-off.
    console.log("Finding stored", {
      findingId: finding.findingId,
      zone: finding.zone,
      photoCount: finding.photos.length,
      photos: finding.photos,
      voiceRecording: finding.voiceRecording,
    });
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
            onComplete={() => {
              // Finalize the inspection. The Complete screen derives the
              // final payload from these values — completedAt != null forces
              // status "Completed" inside buildSubmissionPayload.
              const end = nowMs();
              const finalDuration = Math.round(
                (end - session.startedAt) / 1000
              );
              const finalSession: InspectionSession = {
                ...session,
                status: "Completed",
              };
              setCompletedAt(end);
              setDurationSeconds(finalDuration);
              setSession(finalSession);
              // Build the finalized payload and send it to the n8n webhook.
              const payload = buildFinalSubmissionPayload({
                session: finalSession,
                zones: zonesForSession(finalSession),
                zoneStatuses,
                zoneDurations,
                findings,
                completedAt: end,
              });
              console.log("Final submission payload", payload);
              submitInspectionPayload(payload)
                .then((res) =>
                  console.log("n8n webhook response", res.status, res.body)
                )
                .catch((err) =>
                  console.error("Inspection submission failed", err)
                );
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
            session={session}
            zones={zonesForSession(session)}
            zoneStatuses={zoneStatuses}
            zoneDurations={zoneDurations}
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
