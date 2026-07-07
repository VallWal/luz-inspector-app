import Image from "next/image";
import type { InspectionSession } from "@/types/inspection";
import { formatTime } from "../lib/duration";
import { ChevronRightIcon } from "./icons";

interface Props {
  /** Active (in-progress) inspection session, if any. */
  session: InspectionSession | null;
  onResume: () => void;
  onStartNew: () => void;
  onRecordEvent: () => void;
}

export default function HomeScreen({
  session,
  onResume,
  onStartNew,
  onRecordEvent,
}: Props) {
  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="px-5 pt-6 pb-2">
        {/* Brand lockup — same logo, font and colors as the website header */}
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 overflow-hidden rounded-xl shadow-sm">
            <Image
              src="/logo.png"
              alt="Luz Property Care"
              width={44}
              height={44}
              className="h-full w-full object-cover"
              priority
            />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-semibold tracking-wide text-navy-900">
              LUZ
            </span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-600">
              Property Care
            </span>
          </span>
        </div>
        <h1 className="mt-6 text-center text-3xl font-semibold text-navy">
          LUZ App
        </h1>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-5 pb-8 pt-4">
        {/* Active inspection */}
        {session && (
          <section className="rounded-3xl bg-navy px-6 py-5 text-white shadow-lg shadow-navy/20">
            <p className="text-xs font-medium uppercase tracking-wider text-white/50">
              Continue Inspection
            </p>
            <h2 className="mt-2 text-xl font-semibold">{session.propertyName}</h2>
            <p className="mt-0.5 text-sm text-white/70">
              {session.inspectionType}
            </p>
            <p className="mt-0.5 text-sm text-white/50">
              Started at {formatTime(session.startedAt)}
            </p>
            <button
              onClick={onResume}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-base font-semibold text-navy shadow-sm transition-all active:scale-[0.98]"
            >
              Resume Inspection <ChevronRightIcon size={16} />
            </button>
          </section>
        )}

        {/* Start new */}
        <section className="rounded-3xl bg-white px-6 py-6 shadow-sm">
          {!session && (
            <p className="mb-4 text-sm leading-relaxed text-navy/60">
              No active inspection. Start a new one to begin capturing
              findings on site.
            </p>
          )}
          <button
            onClick={onStartNew}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-navy text-lg font-semibold text-white shadow-md shadow-navy/25 transition-all active:scale-[0.98] hover:bg-navy-deep"
          >
            Start New Inspection
          </button>
        </section>

        {/* Record event (voice log) */}
        <section className="rounded-3xl bg-white px-6 py-6 shadow-sm">
          <p className="mb-4 text-sm leading-relaxed text-navy/60">
            Log an access, contractor visit or observation as a quick voice
            note.
          </p>
          <button
            onClick={onRecordEvent}
            className="flex h-16 w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-navy bg-white text-lg font-semibold text-navy shadow-sm transition-all active:scale-[0.98] hover:bg-beige-soft"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect
                x="9"
                y="3"
                width="6"
                height="12"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Record Event
          </button>
        </section>
      </main>
    </div>
  );
}
