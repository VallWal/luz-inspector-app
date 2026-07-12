"use client";

import { useState } from "react";
import type { BaselinePhotoDraft, BaselineType } from "@/types/passport";

interface Props {
  photos: BaselinePhotoDraft[];
  existingCount: number;
  onChange: (photos: BaselinePhotoDraft[]) => void;
  nextLocalId: () => string;
}

function isoDate(ms: number): string {
  const d = new Date(ms > 0 ? ms : Date.now());
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Baseline photos: multi-capture grid with a sticky Interior/Exterior toggle.
 * Every photo becomes one Photos Baseline record with its capture date —
 * file date for library picks, today for camera shots. Photos can be added
 * on the spot or any time before submitting (the draft waits).
 */
export default function BaselineSection({
  photos,
  existingCount,
  onChange,
  nextLocalId,
}: Props) {
  /** Sticky tag for new captures — 15 exterior shots = 15 shutter taps. */
  const [currentType, setCurrentType] = useState<BaselineType>("Exterior");
  /** Photo being edited (title / location). */
  const [editing, setEditing] = useState<string | null>(null);

  const addFiles = (files: FileList | null) => {
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
        type: currentType,
        title: "",
        location: "",
        capturedOn: isoDate(f.lastModified),
      })
    );
    onChange([...photos, ...added]);
  };

  const patch = (localId: string, p: Partial<BaselinePhotoDraft>) =>
    onChange(photos.map((b) => (b.localId === localId ? { ...b, ...p } : b)));

  const remove = (localId: string) => {
    const b = photos.find((x) => x.localId === localId);
    if (b) URL.revokeObjectURL(b.photo.localObjectUrl);
    onChange(photos.filter((x) => x.localId !== localId));
    if (editing === localId) setEditing(null);
  };

  const cycleType = (b: BaselinePhotoDraft) => {
    const next: BaselineType =
      b.type === "Exterior" ? "Interior" : b.type === "Interior" ? "" : "Exterior";
    patch(b.localId, { type: next });
  };

  const untagged = photos.filter((b) => b.type === "").length;
  const edited = photos.find((b) => b.localId === editing) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {existingCount > 0 && (
        <p className="text-xs text-navy/50">
          {existingCount} photo{existingCount === 1 ? "" : "s"} already in the
          passport — new ones are added on top.
        </p>
      )}

      {/* Sticky tag for the next captures */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
          Tag for new photos
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["Exterior", "Interior"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setCurrentType(t)}
              aria-pressed={currentType === t}
              className={`h-11 rounded-2xl border-2 text-sm font-semibold transition-all active:scale-[0.98] ${
                currentType === t
                  ? "border-navy bg-navy text-white"
                  : "border-navy/10 bg-white text-navy/60"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Capture */}
      <input
        id="baseline-camera"
        type="file"
        accept="image/*"
        capture="environment"
        className="input-visually-hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        id="baseline-library"
        type="file"
        accept="image/*"
        multiple
        className="input-visually-hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="grid grid-cols-2 gap-3">
        <label
          htmlFor="baseline-camera"
          className="flex h-14 cursor-pointer select-none items-center justify-center rounded-2xl bg-navy text-sm font-semibold text-white shadow-md shadow-navy/25 active:scale-[0.98]"
        >
          📷 Take Photo
        </label>
        <label
          htmlFor="baseline-library"
          className="flex h-14 cursor-pointer select-none items-center justify-center rounded-2xl border-2 border-dashed border-navy/15 bg-beige-soft text-sm font-semibold text-navy/60 active:scale-[0.98]"
        >
          🖼️ From Library
        </label>
      </div>

      {untagged > 0 && (
        <p className="text-xs font-medium text-status-yellow">
          ⚠ {untagged} photo{untagged === 1 ? "" : "s"} untagged — tap the badge
          to set Interior/Exterior.
        </p>
      )}

      {/* Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((b) => (
            <div key={b.localId} className="relative">
              <button
                onClick={() => setEditing(b.localId)}
                className="block w-full"
                aria-label="Edit photo details"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.photo.localObjectUrl}
                  alt={b.title || "Baseline photo"}
                  className="aspect-square w-full rounded-xl object-cover shadow-sm"
                />
              </button>
              <button
                onClick={() => cycleType(b)}
                aria-label="Change photo tag"
                className={`absolute bottom-1 left-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow ${
                  b.type === "Exterior"
                    ? "bg-navy text-white"
                    : b.type === "Interior"
                      ? "bg-white text-navy"
                      : "bg-status-yellow text-white"
                }`}
              >
                {b.type === "" ? "?" : b.type === "Exterior" ? "EXT" : "INT"}
              </button>
              <button
                aria-label="Remove photo"
                onClick={() => remove(b.localId)}
                className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white shadow"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Detail editor */}
      {edited && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-end">
          <button
            aria-label="Close"
            onClick={() => setEditing(null)}
            className="anim-fade-in absolute inset-0 cursor-default bg-navy-deep/50 backdrop-blur-[2px]"
          />
          <div className="anim-sheet-up relative w-full max-w-md rounded-t-3xl bg-white px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-navy/15" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={edited.photo.localObjectUrl}
              alt=""
              className="h-40 w-full rounded-2xl object-cover"
            />
            <p className="mt-2 text-xs text-navy/50">
              Captured on {edited.capturedOn}
            </p>
            <label className="mt-3 flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-navy/50">
                Title (optional)
              </span>
              <input
                type="text"
                value={edited.title}
                placeholder="e.g. Pool terrace from the garden"
                onChange={(e) => patch(edited.localId, { title: e.target.value })}
                className="h-12 w-full rounded-2xl border-2 border-navy/10 bg-white px-4 text-sm text-navy placeholder:text-navy/35 focus:border-navy/40 focus:outline-none"
              />
            </label>
            <label className="mt-3 flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-navy/50">
                Location (optional)
              </span>
              <input
                type="text"
                value={edited.location}
                placeholder="e.g. South terrace"
                onChange={(e) =>
                  patch(edited.localId, { location: e.target.value })
                }
                className="h-12 w-full rounded-2xl border-2 border-navy/10 bg-white px-4 text-sm text-navy placeholder:text-navy/35 focus:border-navy/40 focus:outline-none"
              />
            </label>
            <button
              onClick={() => setEditing(null)}
              className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-navy text-sm font-semibold text-white active:scale-[0.98]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
