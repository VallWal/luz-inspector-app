"use client";

import type { PhotoAttachment } from "@/types/inspection";
import {
  FEATURE_FIELDS,
  PROPERTY_TYPES,
  type PropertySpecs,
} from "@/types/passport";

interface Props {
  specs: PropertySpecs;
  onChange: (specs: PropertySpecs) => void;
}

function NumberField({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider text-navy/50">
        {label}
        {suffix ? ` (${suffix})` : ""}
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={value == null ? "" : String(value)}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
          onChange(Number.isFinite(n) ? n : null);
        }}
        className="h-12 w-full rounded-2xl border-2 border-navy/10 bg-white px-4 text-sm text-navy focus:border-navy/40 focus:outline-none"
      />
    </label>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const v = value ?? 0;
  return (
    <div className="flex items-center justify-between rounded-2xl border-2 border-navy/10 bg-white px-4 py-2.5">
      <span className="text-sm font-medium text-navy">{label}</span>
      <span className="flex items-center gap-3">
        <button
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(0, v - 1))}
          className="flex size-9 items-center justify-center rounded-xl bg-beige-soft text-lg font-semibold text-navy active:scale-95"
        >
          –
        </button>
        <span className="w-6 text-center text-base font-semibold tabular-nums text-navy">
          {value == null ? "–" : value}
        </span>
        <button
          aria-label={`Increase ${label}`}
          onClick={() => onChange(v + 1)}
          className="flex size-9 items-center justify-center rounded-xl bg-beige-soft text-lg font-semibold text-navy active:scale-95"
        >
          +
        </button>
      </span>
    </div>
  );
}

/** Property specs — one pre-filled screen; the inspector mostly confirms. */
export default function SpecsForm({ specs, onChange }: Props) {
  const set = (patch: Partial<PropertySpecs>) =>
    onChange({ ...specs, ...patch });

  const addHero = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (specs.heroPhoto) URL.revokeObjectURL(specs.heroPhoto.localObjectUrl);
    const photo: PhotoAttachment = {
      localObjectUrl: URL.createObjectURL(f),
      name: f.name || "property-image.jpg",
      mimeType: f.type || "image/jpeg",
      sizeBytes: f.size,
    };
    set({ heroPhoto: photo });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Type */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
          Property Type
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => set({ propertyType: t })}
              aria-pressed={specs.propertyType === t}
              className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${
                specs.propertyType === t
                  ? "border-navy bg-navy text-white"
                  : "border-navy/10 bg-white text-navy/60"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Sizes */}
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Floor Area"
          suffix="m²"
          value={specs.floorArea}
          onChange={(v) => set({ floorArea: v })}
        />
        <NumberField
          label="Plot Size"
          suffix="m²"
          value={specs.plotSize}
          onChange={(v) => set({ plotSize: v })}
        />
        <NumberField
          label="Construction Year"
          value={specs.constructionYear}
          onChange={(v) => set({ constructionYear: v })}
        />
      </div>

      {/* Layout */}
      <div className="flex flex-col gap-2">
        <Stepper
          label="Floors"
          value={specs.floors}
          onChange={(v) => set({ floors: v })}
        />
        <Stepper
          label="Bedrooms"
          value={specs.bedrooms}
          onChange={(v) => set({ bedrooms: v })}
        />
        <Stepper
          label="Bathrooms"
          value={specs.bathrooms}
          onChange={(v) => set({ bathrooms: v })}
        />
      </div>

      {/* Features */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
          Features
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {FEATURE_FIELDS.map((f) => {
            const v = specs.features[f];
            const on = v === "Yes";
            return (
              <button
                key={f}
                onClick={() =>
                  set({
                    features: { ...specs.features, [f]: on ? "No" : "Yes" },
                  })
                }
                aria-pressed={on}
                className={`flex min-h-11 items-center justify-between rounded-2xl border-2 px-3.5 py-2 text-left text-sm font-semibold transition-all active:scale-[0.98] ${
                  on
                    ? "border-status-green bg-status-green-soft text-status-green"
                    : "border-navy/10 bg-white text-navy/50"
                }`}
              >
                {f}
                <span className="text-xs font-medium">
                  {v === "" ? "–" : v}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero photo */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
          Property Photo
        </p>
        {specs.heroPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={specs.heroPhoto.localObjectUrl}
            alt="New property photo"
            className="mt-2 h-36 w-full rounded-2xl object-cover shadow-sm"
          />
        )}
        <input
          id="hero-input"
          type="file"
          accept="image/*"
          capture="environment"
          className="input-visually-hidden"
          onChange={(e) => {
            addHero(e.target.files);
            e.target.value = "";
          }}
        />
        <label
          htmlFor="hero-input"
          className="mt-2 flex h-12 cursor-pointer select-none items-center justify-center rounded-2xl border-2 border-dashed border-navy/15 bg-beige-soft text-sm font-semibold text-navy/60 active:scale-[0.98]"
        >
          📷 {specs.heroPhoto ? "Retake Property Photo" : "Take Property Photo"}
        </label>
      </div>
    </div>
  );
}
