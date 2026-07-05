"use client";

import { useMemo, useState } from "react";
import type { InspectionSubmissionPayload } from "../lib/payload";
import { CheckIcon } from "./icons";

interface Props {
  payload: InspectionSubmissionPayload;
  /** Short hint shown above the JSON (e.g. debug vs. final). */
  note?: string;
}

/** Collapsible developer section showing the exact n8n submission JSON. */
export default function DevPayloadSection({ payload, note }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const json = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable (e.g. non-secure context) — ignore.
    }
  };

  return (
    <section className="rounded-3xl border border-dashed border-navy/15 bg-beige-soft px-6 py-4">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between text-left"
      >
        <span>
          <span className="text-xs font-medium uppercase tracking-wider text-navy/50">
            Developer
          </span>
          <span className="block text-sm font-semibold text-navy/80">
            {open ? "Hide Payload" : "View Payload"}
          </span>
        </span>
        <span
          className={`text-navy/40 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="mt-2">
          {note && <p className="text-xs text-navy/50">{note}</p>}
          <pre className="mt-2 max-w-full whitespace-pre-wrap break-all rounded-2xl bg-navy-deep px-4 py-3 font-mono text-[11px] leading-relaxed text-white/90">
            {json}
          </pre>
          <button
            onClick={copy}
            className="mt-2 flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-navy/60 transition-colors hover:text-navy"
          >
            {copied ? (
              <>
                <CheckIcon size={14} /> Copied
              </>
            ) : (
              "Copy JSON"
            )}
          </button>
        </div>
      )}
    </section>
  );
}
