"use client";

import { useEffect, useRef, useState } from "react";
import type { Property } from "../../data";
import type {
  BaselinePhotoDraft,
  InventoryItem,
  InventoryKind,
  PassportSession,
  PropertySpecs,
} from "@/types/passport";
import { FEATURE_FIELDS } from "@/types/passport";
import {
  fetchPassportData,
  invalidatePassportData,
} from "@/app/lib/passportData";
import { submitPassport } from "@/app/lib/passportSubmission";
import {
  clearPassportDraft,
  loadPassportDraft,
  savePassportDraft,
} from "@/app/lib/passportDraftStore";
import { BackButton, CheckIcon } from "../icons";
import { INVENTORY_CONFIGS } from "./config";
import SpecsForm from "./SpecsForm";
import InventorySection from "./InventorySection";
import BaselineSection from "./BaselineSection";

type SectionId = "specs" | InventoryKind | "photos";
type Phase = "loading" | "blocked" | "error" | "ready";
type SubmitState = "idle" | "sending" | "success" | "error";

const INVENTORY_KINDS: InventoryKind[] = ["utility", "appliance", "contact", "key"];

interface Props {
  property: Property;
  inspector: string;
  onExit: () => void;
}

function emptySpecs(): PropertySpecs {
  const features = {} as PropertySpecs["features"];
  for (const f of FEATURE_FIELDS) features[f] = "";
  return {
    propertyType: "",
    constructionYear: null,
    floorArea: null,
    plotSize: null,
    floors: null,
    bedrooms: null,
    bathrooms: null,
    features,
    heroPhoto: null,
  };
}

/**
 * Property Passport capture — hub-and-spoke: six sections, any order, any
 * number of visits into each. The draft persists on-device until a confirmed
 * submit, so photos can be added on the spot or hours later.
 */
export default function PassportScreen({ property, inspector, onExit }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [blockedByProperty, setBlockedByProperty] = useState("");
  const [section, setSection] = useState<SectionId | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

  const [session, setSession] = useState<PassportSession | null>(null);
  const [specs, setSpecs] = useState<PropertySpecs>(emptySpecs());
  const [specsChanged, setSpecsChanged] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [baselinePhotos, setBaselinePhotos] = useState<BaselinePhotoDraft[]>([]);
  const [existingBaselineCount, setExistingBaselineCount] = useState(0);

  const seq = useRef(0);
  const nextLocalId = () => `n-${++seq.current}`;

  const startFresh = async () => {
    setPhase("loading");
    try {
      const data = await fetchPassportData(property.id);
      const existing: InventoryItem[] = [];
      const seed = (kind: InventoryKind, list: typeof data.utilities) => {
        list.forEach((r, i) =>
          existing.push({
            localId: `x-${kind}-${i}`,
            recordId: r.recordId,
            kind,
            type: r.type,
            fields: r.fields,
            photos: [],
            existingPhotoCount: r.photoCount,
            dirty: false,
          })
        );
      };
      seed("utility", data.utilities);
      seed("appliance", data.appliances);
      seed("contact", data.contacts);
      seed("key", data.keys);
      setItems(existing);
      setSpecs({ ...data.specs, heroPhoto: null });
      setSpecsChanged(false);
      setBaselinePhotos([]);
      setExistingBaselineCount(data.baselinePhotoCount);
      setSession({
        passportId: `pass-${property.id}-${Date.now()}`,
        propertyId: property.id,
        propertyName: property.name,
        inspector,
        startedAt: Date.now(),
      });
      setPhase("ready");
    } catch (err) {
      console.error("Passport data fetch failed", err);
      setPhase("error");
    }
  };

  // Restore a matching draft, block on a foreign one, else start fresh.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const draft = await loadPassportDraft();
      if (cancelled) return;
      if (draft && draft.session.propertyId === property.id) {
        setSession(draft.session);
        setSpecs(draft.specs);
        setSpecsChanged(draft.specsChanged);
        setItems(draft.items);
        setBaselinePhotos(draft.baselinePhotos);
        seq.current = draft.items.length + draft.baselinePhotos.length + 100;
        setPhase("ready");
        // Counts only — never overwrite the restored draft with server data.
        fetchPassportData(property.id)
          .then((d) => !cancelled && setExistingBaselineCount(d.baselinePhotoCount))
          .catch(() => undefined);
        return;
      }
      if (draft) {
        setBlockedByProperty(draft.session.propertyName);
        setPhase("blocked");
        return;
      }
      await startFresh();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.id]);

  // Persist on every change (best-effort, one draft at a time).
  useEffect(() => {
    if (phase !== "ready" || !session || submitState === "success") return;
    savePassportDraft({ session, specs, specsChanged, items, baselinePhotos });
  }, [phase, session, specs, specsChanged, items, baselinePhotos, submitState]);

  const saveItem = (item: InventoryItem) =>
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.localId === item.localId);
      if (idx < 0) return [...prev, item];
      const next = [...prev];
      next[idx] = item;
      return next;
    });

  const removeItem = (localId: string) =>
    setItems((prev) => prev.filter((i) => i.localId !== localId));

  // Hub quick-camera: dump an untagged baseline photo from anywhere.
  const quickPhoto = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const added = Array.from(files).map(
      (f): BaselinePhotoDraft => ({
        localId: nextLocalId(),
        photo: {
          localObjectUrl: URL.createObjectURL(f),
          name: f.name || "baseline.jpg",
          mimeType: f.type || "image/jpeg",
          sizeBytes: f.size,
        },
        type: "",
        title: "",
        location: "",
        capturedOn: new Date().toISOString().slice(0, 10),
      })
    );
    setBaselinePhotos((prev) => [...prev, ...added]);
  };

  const newItems = items.filter(
    (i) => i.recordId === null || i.dirty || i.photos.length > 0
  );
  const hasChanges =
    specsChanged ||
    specs.heroPhoto !== null ||
    newItems.length > 0 ||
    baselinePhotos.length > 0;

  const specFillCount = (() => {
    let n = 0;
    if (specs.propertyType) n++;
    for (const v of [
      specs.constructionYear,
      specs.floorArea,
      specs.plotSize,
      specs.floors,
      specs.bedrooms,
      specs.bathrooms,
    ])
      if (v != null) n++;
    for (const f of FEATURE_FIELDS) if (specs.features[f]) n++;
    return n;
  })();

  const submit = async () => {
    if (!session || submitState === "sending") return;
    setSubmitState("sending");
    try {
      await submitPassport({ session, specs, specsChanged, items, baselinePhotos });
      await clearPassportDraft();
      invalidatePassportData(property.id);
      setSubmitState("success");
    } catch (err) {
      console.error("Passport submission failed", err);
      setSubmitState("error");
    }
  };

  // ---- Non-ready phases ------------------------------------------------------

  if (phase === "loading") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 px-8">
        <span className="size-8 animate-spin rounded-full border-[3px] border-navy/15 border-t-navy" />
        <p className="text-sm text-navy/60">Loading passport data…</p>
      </div>
    );
  }

  if (phase === "blocked") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-lg font-semibold text-navy">Unsent passport draft</p>
        <p className="text-sm leading-relaxed text-navy/60">
          There is an unsent passport draft for{" "}
          <span className="font-semibold">{blockedByProperty}</span>. Submit it
          first, or discard it to start here.
        </p>
        <button
          onClick={async () => {
            await clearPassportDraft();
            await startFresh();
          }}
          className="flex h-14 w-full max-w-xs items-center justify-center rounded-2xl border-2 border-status-red/30 bg-status-red-soft text-sm font-semibold text-status-red active:scale-[0.98]"
        >
          Discard that draft & start here
        </button>
        <button
          onClick={onExit}
          className="flex h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-navy text-sm font-semibold text-white active:scale-[0.98]"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-lg font-semibold text-navy">Could not load data</p>
        <p className="text-sm text-navy/60">
          The passport starts pre-filled from the current records — a
          connection is needed once to begin.
        </p>
        <button
          onClick={startFresh}
          className="flex h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-navy text-sm font-semibold text-white active:scale-[0.98]"
        >
          ↻ Retry
        </button>
        <button
          onClick={onExit}
          className="flex min-h-11 items-center text-sm font-semibold text-navy/50"
        >
          Go Back
        </button>
      </div>
    );
  }

  // ---- Success ------------------------------------------------------------------

  if (submitState === "success") {
    return (
      <div className="flex min-h-full flex-col">
        <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <div className="anim-pop flex size-28 items-center justify-center rounded-full bg-status-green text-white shadow-lg shadow-status-green/30">
            <CheckIcon size={52} />
          </div>
          <h1 className="anim-rise mt-8 text-2xl font-semibold text-navy">
            Passport Data Saved
          </h1>
          <p className="anim-rise mt-2 text-sm text-navy/60">
            {property.name} · records are being written and photos processed
          </p>
          <div className="anim-rise mt-8 grid w-full grid-cols-2 gap-3">
            <div className="rounded-3xl bg-white px-3 py-4 shadow-sm">
              <p className="text-xl font-semibold text-navy">{newItems.length}</p>
              <p className="mt-0.5 text-xs text-navy/50">records</p>
            </div>
            <div className="rounded-3xl bg-white px-3 py-4 shadow-sm">
              <p className="text-xl font-semibold text-navy">
                {baselinePhotos.length}
              </p>
              <p className="mt-0.5 text-xs text-navy/50">baseline photos</p>
            </div>
          </div>
        </main>
        <footer className="px-5 pb-6 pt-4">
          <button
            onClick={onExit}
            className="flex h-16 w-full items-center justify-center rounded-2xl bg-navy text-lg font-semibold text-white shadow-md shadow-navy/25 active:scale-[0.98]"
          >
            Done
          </button>
        </footer>
      </div>
    );
  }

  // ---- Section view ---------------------------------------------------------------

  if (section !== null) {
    const title =
      section === "specs"
        ? "Property Specs"
        : section === "photos"
          ? "Baseline Photos"
          : INVENTORY_CONFIGS[section].title;
    return (
      <div className="flex min-h-full flex-col">
        <header className="flex items-center gap-3 px-5 pt-5 pb-2">
          <BackButton onClick={() => setSection(null)} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
              Property Passport · {property.name}
            </p>
            <h1 className="text-base font-semibold text-navy">{title}</h1>
          </div>
        </header>
        <main className="mx-5 mb-6 mt-3 flex-1 rounded-3xl bg-white px-5 py-5 shadow-sm">
          {section === "specs" && (
            <SpecsForm
              specs={specs}
              onChange={(s) => {
                setSpecs(s);
                setSpecsChanged(true);
              }}
            />
          )}
          {section === "photos" && (
            <BaselineSection
              photos={baselinePhotos}
              existingCount={existingBaselineCount}
              onChange={setBaselinePhotos}
              nextLocalId={nextLocalId}
            />
          )}
          {section !== "specs" && section !== "photos" && (
            <InventorySection
              kind={section}
              items={items.filter((i) => i.kind === section)}
              onSaveItem={saveItem}
              onRemoveItem={removeItem}
              nextLocalId={nextLocalId}
            />
          )}
        </main>
      </div>
    );
  }

  // ---- Hub -------------------------------------------------------------------------

  const untagged = baselinePhotos.filter((b) => b.type === "").length;

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center gap-3 px-5 pt-5 pb-2">
        <BackButton onClick={onExit} />
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
            Property Passport
          </p>
          <h1 className="text-base font-semibold text-navy">{property.name}</h1>
        </div>
      </header>

      <main className="mx-5 mt-3 flex flex-1 flex-col gap-2.5 pb-2">
        {/* Specs */}
        <button
          onClick={() => setSection("specs")}
          className="flex items-center justify-between rounded-3xl bg-white px-5 py-4 text-left shadow-sm active:scale-[0.99]"
        >
          <span>
            <span className="block text-base font-semibold text-navy">
              🏠 Property Specs
            </span>
            <span className="mt-0.5 block text-xs text-navy/55">
              {specFillCount} of {6 + 1 + FEATURE_FIELDS.length} filled
              {specsChanged ? " · edited" : ""}
            </span>
          </span>
          <span className="text-navy/30">›</span>
        </button>

        {/* Inventory sections */}
        {INVENTORY_KINDS.map((kind) => {
          const cfg = INVENTORY_CONFIGS[kind];
          const all = items.filter((i) => i.kind === kind);
          const fresh = all.filter(
            (i) => i.recordId === null || i.dirty || i.photos.length > 0
          ).length;
          return (
            <button
              key={kind}
              onClick={() => setSection(kind)}
              className="flex items-center justify-between rounded-3xl bg-white px-5 py-4 text-left shadow-sm active:scale-[0.99]"
            >
              <span>
                <span className="block text-base font-semibold text-navy">
                  {cfg.emoji} {cfg.title}
                </span>
                <span className="mt-0.5 block text-xs text-navy/55">
                  {all.length === 0
                    ? "none recorded"
                    : `${all.length} recorded`}
                  {fresh > 0 ? ` · ${fresh} new/edited` : ""}
                </span>
              </span>
              <span className="text-navy/30">›</span>
            </button>
          );
        })}

        {/* Baseline photos */}
        <button
          onClick={() => setSection("photos")}
          className="flex items-center justify-between rounded-3xl bg-white px-5 py-4 text-left shadow-sm active:scale-[0.99]"
        >
          <span>
            <span className="block text-base font-semibold text-navy">
              📷 Baseline Photos
            </span>
            <span className="mt-0.5 block text-xs text-navy/55">
              {existingBaselineCount > 0 && `${existingBaselineCount} in passport · `}
              {baselinePhotos.length} new
              {untagged > 0 ? ` · ⚠ ${untagged} untagged` : ""}
            </span>
          </span>
          <span className="text-navy/30">›</span>
        </button>

        {/* Quick photo from the hub — tag later in Baseline Photos */}
        <input
          id="hub-quick-camera"
          type="file"
          accept="image/*"
          capture="environment"
          className="input-visually-hidden"
          onChange={(e) => {
            quickPhoto(e.target.files);
            e.target.value = "";
          }}
        />
        <label
          htmlFor="hub-quick-camera"
          className="flex h-12 cursor-pointer select-none items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-navy/15 bg-beige-soft text-sm font-semibold text-navy/60 active:scale-[0.98]"
        >
          📷 Quick photo (tag later)
        </label>
      </main>

      {submitState === "error" && (
        <div className="mx-5 mb-2 rounded-2xl border-2 border-status-red/30 bg-status-red-soft px-4 py-3">
          <p className="text-sm font-semibold text-status-red">
            ⚠ Could not save the passport data
          </p>
          <p className="mt-0.5 text-xs text-navy/60">
            Nothing is lost — the draft stays on this device. Check the
            connection and try again.
          </p>
        </div>
      )}

      <footer className="px-5 pb-6 pt-2">
        <button
          onClick={submit}
          disabled={!hasChanges || submitState === "sending"}
          className={`flex h-16 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-40 ${
            submitState === "error"
              ? "bg-status-red shadow-status-red/25"
              : "bg-status-green shadow-status-green/25"
          }`}
        >
          {submitState === "sending" ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving passport data…
            </>
          ) : submitState === "error" ? (
            <>↻ Retry Save</>
          ) : (
            <>
              <CheckIcon /> Submit Passport Data
            </>
          )}
        </button>
        <p className="mt-2 text-center text-xs text-navy/45">
          Draft is saved on this device — you can also submit later.
        </p>
      </footer>
    </div>
  );
}
