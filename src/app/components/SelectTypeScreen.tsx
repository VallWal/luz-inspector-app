"use client";

import { useState } from "react";
import type { Property } from "../data";
import { INSPECTION_TYPE_NAMES } from "@/config/inspectionTypes";
import { BackButton, CheckIcon } from "./icons";

interface Props {
  property: Property;
  onBack: () => void;
  onStart: (inspectionType: string) => void;
}

export default function SelectTypeScreen({ property, onBack, onStart }: Props) {
  const [type, setType] = useState<string | null>(null);

  return (
    <div className="flex min-h-full flex-col">
      {/* Top navigation */}
      <header className="flex items-center gap-3 px-5 pt-5 pb-2">
        <BackButton onClick={onBack} />
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
            New Inspection · Step 2 of 2
          </p>
          <h1 className="text-base font-semibold text-navy">
            Select Inspection Type
          </h1>
        </div>
      </header>

      {/* Property context */}
      <section className="mx-5 mt-3 rounded-3xl bg-navy px-6 py-4 text-white shadow-lg shadow-navy/20">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">{property.name}</h2>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide">
            {property.code}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-white/60">{property.address}</p>
      </section>

      {/* Type list */}
      <main className="mx-5 mt-4 flex flex-1 flex-col rounded-3xl bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-2">
          {INSPECTION_TYPE_NAMES.map((name) => {
            const selected = type === name;
            return (
              <button
                key={name}
                onClick={() => setType(name)}
                aria-pressed={selected}
                className={`flex min-h-14 items-center justify-between rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition-all active:scale-[0.99] ${
                  selected
                    ? "border-navy bg-navy text-white shadow-md shadow-navy/20"
                    : "border-navy/10 bg-white text-navy/70 hover:border-navy/25"
                }`}
              >
                {name}
                {selected && <CheckIcon size={16} />}
              </button>
            );
          })}
        </div>

        {/* Start */}
        <div className="mt-auto pt-6">
          <button
            onClick={() => type && onStart(type)}
            disabled={!type}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-navy text-lg font-semibold text-white shadow-md shadow-navy/25 transition-all active:scale-[0.98] hover:bg-navy-deep disabled:opacity-40"
          >
            Start Inspection
          </button>
        </div>
      </main>

      <div className="pb-7" />
    </div>
  );
}
