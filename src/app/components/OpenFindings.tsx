"use client";

import { openFindingsForProperty } from "../data";

/**
 * Open (not resolved) findings for the selected property — shown before the
 * inspection starts so the inspector knows what still requires attention.
 */
export default function OpenFindings({ propertyId }: { propertyId: string }) {
  const findings = openFindingsForProperty(propertyId);
  if (findings.length === 0) return null;

  return (
    <section className="mx-5 mt-4 rounded-3xl bg-white px-6 py-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
        ⚠ Open Findings ({findings.length})
      </p>
      <ul className="mt-3 flex flex-col gap-3">
        {findings.map((f) => {
          const isRed = f.severity !== "Monitor";
          return (
            <li key={f.findingId} className="flex items-start gap-3">
              {f.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.photoUrl}
                  alt=""
                  className="size-14 shrink-0 rounded-xl object-cover shadow-sm"
                />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-beige-soft text-lg">
                  ⚠
                </span>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isRed
                        ? "bg-status-red-soft text-status-red"
                        : "bg-status-yellow-soft text-status-yellow"
                    }`}
                  >
                    {f.severity || "—"}
                  </span>
                  <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[11px] font-medium text-navy/60">
                    {f.status}
                  </span>
                  <span className="text-[11px] font-medium text-navy/40">
                    {f.findingId}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-snug text-navy/80">
                  {f.description || "No description"}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
