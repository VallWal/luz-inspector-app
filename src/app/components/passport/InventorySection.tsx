"use client";

import { useState } from "react";
import type { PhotoAttachment } from "@/types/inspection";
import type { InventoryItem, InventoryKind } from "@/types/passport";
import { extractFieldsFromPhoto } from "@/app/lib/passportSubmission";
import { INVENTORY_CONFIGS, itemSummary } from "./config";

interface Props {
  kind: InventoryKind;
  items: InventoryItem[];
  onSaveItem: (item: InventoryItem) => void;
  onRemoveItem: (localId: string) => void;
  nextLocalId: () => string;
}

interface SheetState {
  item: InventoryItem;
  isNew: boolean;
}

/**
 * Generic inventory section (Utilities, Appliances, Contacts, Keys):
 * existing + new records as cards, photo-first add sheet with optional
 * AI field extraction from the nameplate/meter photo.
 */
export default function InventorySection({
  kind,
  items,
  onSaveItem,
  onRemoveItem,
  nextLocalId,
}: Props) {
  const cfg = INVENTORY_CONFIGS[kind];
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const openNew = () => {
    setReadError(null);
    setSheet({
      isNew: true,
      item: {
        localId: nextLocalId(),
        recordId: null,
        kind,
        type: cfg.types ? "" : "-",
        fields: {},
        photos: [],
        existingPhotoCount: 0,
        dirty: false,
      },
    });
  };

  const openEdit = (item: InventoryItem) => {
    setReadError(null);
    setSheet({ isNew: false, item: { ...item, fields: { ...item.fields } } });
  };

  const patchSheet = (patch: Partial<InventoryItem>) =>
    setSheet((s) => (s ? { ...s, item: { ...s.item, ...patch, dirty: true } } : s));

  const addPhotos = (files: FileList | null) => {
    if (!files || files.length === 0 || !sheet) return;
    const added = Array.from(files).map(
      (f): PhotoAttachment => ({
        localObjectUrl: URL.createObjectURL(f),
        name: f.name || "photo.jpg",
        mimeType: f.type || "image/jpeg",
        sizeBytes: f.size,
      })
    );
    patchSheet({ photos: [...sheet.item.photos, ...added] });
  };

  const removePhoto = (url: string) => {
    if (!sheet) return;
    URL.revokeObjectURL(url);
    patchSheet({ photos: sheet.item.photos.filter((p) => p.localObjectUrl !== url) });
  };

  /** AI read: last added photo → fills only EMPTY fields, never overwrites. */
  const readFromPhoto = async () => {
    if (!sheet || sheet.item.photos.length === 0 || reading) return;
    if (kind !== "utility" && kind !== "appliance") return;
    setReading(true);
    setReadError(null);
    try {
      const photo = sheet.item.photos[sheet.item.photos.length - 1];
      const extracted = await extractFieldsFromPhoto({
        photoObjectUrl: photo.localObjectUrl,
        photoName: photo.name,
        kind,
        typeHint: sheet.item.type,
      });
      const fields = { ...sheet.item.fields };
      let applied = 0;
      for (const f of cfg.fields) {
        const v = (extracted as Record<string, string | undefined>)[f.key];
        if (v && !(fields[f.key] || "").trim()) {
          fields[f.key] = v;
          applied++;
        }
      }
      patchSheet({ fields });
      if (applied === 0) setReadError("Nothing new readable on this photo.");
    } catch {
      setReadError("Could not read the photo — fill the fields manually.");
    } finally {
      setReading(false);
    }
  };

  const canSave =
    sheet != null &&
    (cfg.types === null || sheet.item.type !== "") &&
    (sheet.item.photos.length > 0 ||
      cfg.fields.some((f) => (sheet.item.fields[f.key] || "").trim() !== ""));

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && (
        <p className="text-sm text-navy/50">
          Nothing recorded yet — add the first one.
        </p>
      )}

      {items.map((item) => {
        const summary = itemSummary(cfg, item.fields);
        const photoBits = [
          item.existingPhotoCount > 0 ? `${item.existingPhotoCount} in passport` : "",
          item.photos.length > 0 ? `${item.photos.length} new` : "",
        ].filter(Boolean);
        return (
          <button
            key={item.localId}
            onClick={() => openEdit(item)}
            className="rounded-2xl bg-white px-4 py-3 text-left shadow-sm transition-all active:scale-[0.99]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-navy">
                {cfg.types ? item.type || "—" : item.fields.keyTag || "Key"}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {item.recordId === null && (
                  <span className="rounded-full bg-status-green-soft px-2 py-0.5 text-[11px] font-semibold text-status-green">
                    new
                  </span>
                )}
                {item.recordId !== null && item.dirty && (
                  <span className="rounded-full bg-status-yellow-soft px-2 py-0.5 text-[11px] font-semibold text-status-yellow">
                    edited
                  </span>
                )}
              </span>
            </div>
            {summary && (
              <p className="mt-0.5 text-xs leading-snug text-navy/60">{summary}</p>
            )}
            {cfg.hasPhotos && photoBits.length > 0 && (
              <p className="mt-0.5 text-xs text-navy/45">📷 {photoBits.join(" · ")}</p>
            )}
          </button>
        );
      })}

      <button
        onClick={openNew}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-navy text-base font-semibold text-white shadow-md shadow-navy/25 transition-all active:scale-[0.98]"
      >
        + {cfg.addLabel}
      </button>

      {/* Add / edit sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-end">
          <button
            aria-label="Close"
            onClick={() => setSheet(null)}
            className="anim-fade-in absolute inset-0 cursor-default bg-navy-deep/50 backdrop-blur-[2px]"
          />
          <div className="anim-sheet-up relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-navy/15" />
            <h3 className="text-xl font-semibold text-navy">
              {sheet.isNew ? cfg.addLabel : `Edit ${cfg.title}`}
            </h3>

            {/* Type */}
            {cfg.types && (
              <>
                <p className="mt-4 text-xs font-medium uppercase tracking-wider text-navy/50">
                  Type
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cfg.types.map((t) => (
                    <button
                      key={t}
                      onClick={() => patchSheet({ type: t })}
                      aria-pressed={sheet.item.type === t}
                      className={`rounded-full border-2 px-3.5 py-2 text-sm font-semibold transition-all active:scale-95 ${
                        sheet.item.type === t
                          ? "border-navy bg-navy text-white"
                          : "border-navy/10 bg-white text-navy/60"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Photos — first, because the photo carries the data */}
            {cfg.hasPhotos && (
              <>
                <p className="mt-4 text-xs font-medium uppercase tracking-wider text-navy/50">
                  📷 Photos{" "}
                  {sheet.item.existingPhotoCount > 0 &&
                    `(${sheet.item.existingPhotoCount} already in passport)`}
                </p>
                {sheet.item.photos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-3">
                    {sheet.item.photos.map((p, i) => (
                      <div key={p.localObjectUrl} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.localObjectUrl}
                          alt={`Photo ${i + 1}`}
                          className="size-20 rounded-xl object-cover shadow-sm"
                        />
                        <button
                          aria-label="Remove photo"
                          onClick={() => removePhoto(p.localObjectUrl)}
                          className="absolute -right-2 -top-2 flex size-11 items-center justify-center"
                        >
                          <span className="flex size-5 items-center justify-center rounded-full bg-navy text-[10px] font-bold text-white shadow">
                            ✕
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  id={`inv-camera-${kind}`}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="input-visually-hidden"
                  onChange={(e) => {
                    addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
                <input
                  id={`inv-library-${kind}`}
                  type="file"
                  accept="image/*"
                  multiple
                  className="input-visually-hidden"
                  onChange={(e) => {
                    addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <label
                    htmlFor={`inv-camera-${kind}`}
                    className="flex h-14 cursor-pointer select-none items-center justify-center rounded-2xl border-2 border-dashed border-navy/15 bg-beige-soft text-sm font-semibold text-navy/60 active:scale-[0.98]"
                  >
                    📷 Take Photo
                  </label>
                  <label
                    htmlFor={`inv-library-${kind}`}
                    className="flex h-14 cursor-pointer select-none items-center justify-center rounded-2xl border-2 border-dashed border-navy/15 bg-beige-soft text-sm font-semibold text-navy/60 active:scale-[0.98]"
                  >
                    🖼️ From Library
                  </label>
                </div>

                {/* AI read */}
                {cfg.aiExtract && (
                  <>
                    <button
                      onClick={readFromPhoto}
                      disabled={sheet.item.photos.length === 0 || reading}
                      className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-gold-600/40 bg-white text-sm font-semibold text-navy transition-all active:scale-[0.98] disabled:opacity-40"
                    >
                      {reading ? (
                        <>
                          <span className="size-3.5 animate-spin rounded-full border-2 border-navy/20 border-t-navy" />
                          Reading photo…
                        </>
                      ) : (
                        "✨ Read details from photo"
                      )}
                    </button>
                    {readError && (
                      <p className="mt-1.5 text-xs text-navy/50">{readError}</p>
                    )}
                  </>
                )}
              </>
            )}

            {/* Fields */}
            <div className="mt-4 flex flex-col gap-3">
              {cfg.fields.map((f) => (
                <label key={f.key} className="flex flex-col gap-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-navy/50">
                    {f.label}
                  </span>
                  <input
                    type="text"
                    inputMode={f.inputMode === "text" ? undefined : f.inputMode}
                    value={sheet.item.fields[f.key] || ""}
                    placeholder={f.placeholder}
                    onChange={(e) =>
                      patchSheet({
                        fields: { ...sheet.item.fields, [f.key]: e.target.value },
                      })
                    }
                    className="h-12 w-full rounded-2xl border-2 border-navy/10 bg-white px-4 text-sm text-navy placeholder:text-navy/35 focus:border-navy/40 focus:outline-none"
                  />
                </label>
              ))}
            </div>

            {/* Actions */}
            <button
              onClick={() => {
                if (!canSave || !sheet) return;
                onSaveItem(sheet.item);
                setSheet(null);
              }}
              disabled={!canSave}
              className="mt-5 flex h-14 w-full items-center justify-center rounded-2xl bg-navy text-base font-semibold text-white shadow-md shadow-navy/25 transition-all active:scale-[0.98] disabled:opacity-40"
            >
              {sheet.isNew ? "Add" : "Save Changes"}
            </button>
            {sheet.isNew === false && sheet.item.recordId === null && (
              <button
                onClick={() => {
                  onRemoveItem(sheet.item.localId);
                  setSheet(null);
                }}
                className="mt-2 flex min-h-11 w-full items-center justify-center text-sm font-semibold text-status-red"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
