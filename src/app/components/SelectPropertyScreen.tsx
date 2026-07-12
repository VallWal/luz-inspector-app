"use client";

import { useState } from "react";
import type { Property } from "../data";
import { BackButton, ChevronRightIcon } from "./icons";

interface Props {
  properties: Property[];
  /** True while the live property list is still being fetched. */
  propertiesLoading?: boolean;
  /** Forces a fresh fetch past the cache — e.g. a property just created in Airtable. */
  onRefresh?: () => void;
  refreshing?: boolean;
  onBack: () => void;
  onSelect: (property: Property) => void;
}

export default function SelectPropertyScreen({
  properties,
  propertiesLoading = false,
  onRefresh,
  refreshing = false,
  onBack,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? properties.filter((p) =>
        [p.name, p.code, p.address, p.kind].some((v) =>
          v.toLowerCase().includes(q)
        )
      )
    : properties;

  return (
    <div className="flex min-h-full flex-col">
      {/* Top navigation */}
      <header className="flex items-center gap-3 px-5 pt-5 pb-2">
        <BackButton onClick={onBack} />
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
            New Inspection · Step 1 of 2
          </p>
          <h1 className="text-base font-semibold text-navy">Select Property</h1>
        </div>
      </header>

      {/* Search + refresh */}
      <div className="flex items-center gap-2 px-5 pt-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search property, code or address"
          className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-navy/10 bg-white px-4 text-sm text-navy placeholder:text-navy/40 focus:border-navy/40 focus:outline-none"
        />
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh property list"
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 border-navy/10 bg-white text-navy/60 transition-all active:scale-95 hover:border-navy/25 disabled:opacity-50"
          >
            <span
              className={`text-lg leading-none ${refreshing ? "animate-spin" : ""}`}
              aria-hidden
            >
              ↻
            </span>
          </button>
        )}
      </div>

      {/* Property list */}
      <main className="flex flex-col gap-3 px-5 pb-8 pt-4">
        {filtered.map((property) => (
          <button
            key={property.id}
            onClick={() => onSelect(property)}
            className="rounded-3xl bg-white px-5 py-4 text-left shadow-sm transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-navy">
                  {property.name}
                </h2>
                <p className="mt-0.5 text-sm text-navy/60">{property.kind}</p>
                <p className="mt-0.5 truncate text-sm text-navy/50">
                  {property.address}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-beige px-3 py-1 text-xs font-medium tracking-wide text-navy/70">
                  {property.code}
                </span>
                <span className="text-navy/30">
                  <ChevronRightIcon size={16} />
                </span>
              </div>
            </div>
          </button>
        ))}
        {propertiesLoading && (
          <p className="px-1 pt-2 text-sm text-navy/50">Loading properties…</p>
        )}
        {!propertiesLoading && properties.length === 0 && (
          <p className="px-1 pt-2 text-sm text-navy/50">
            No properties available
          </p>
        )}
        {!propertiesLoading && properties.length > 0 && filtered.length === 0 && (
          <p className="px-1 pt-2 text-sm text-navy/50">
            No properties match “{query}”.
          </p>
        )}
      </main>
    </div>
  );
}
