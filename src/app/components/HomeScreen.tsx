import type { InspectionSession } from "@/types/inspection";
import { formatTime } from "../lib/duration";
import { ChevronRightIcon } from "./icons";

interface Props {
  /** Active (in-progress) inspection session, if any. */
  session: InspectionSession | null;
  onResume: () => void;
  onStartNew: () => void;
}

export default function HomeScreen({ session, onResume, onStartNew }: Props) {
  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="px-5 pt-10 pb-2">
        <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
          Luz Property Care
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-navy">Luz Inspector</h1>
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
      </main>
    </div>
  );
}
