import type { Property } from "../data";
import { formatTime } from "../lib/duration";
import { CheckIcon } from "./icons";

interface Props {
  property: Property;
  /** From the inspection session. */
  inspectionType: string;
  /** Epoch ms from the inspection session. */
  startedAt: number | null;
}

/** Short transition screen shown for ~1s after Start Inspection. */
export default function InspectionStartScreen({
  property,
  inspectionType,
  startedAt,
}: Props) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-navy px-8 text-center text-white">
      <p
        className="anim-rise text-xl font-semibold"
        style={{ animationDelay: "0.05s" }}
      >
        {property.name}
      </p>
      <p
        className="anim-rise mt-1 text-sm text-white/60"
        style={{ animationDelay: "0.12s" }}
      >
        {inspectionType}
      </p>

      <div
        className="anim-pop mt-10 flex size-16 items-center justify-center rounded-full bg-status-green text-white shadow-lg shadow-status-green/30"
        style={{ animationDelay: "0.2s" }}
      >
        <CheckIcon size={30} />
      </div>
      <h1
        className="anim-rise mt-5 text-2xl font-semibold"
        style={{ animationDelay: "0.3s" }}
      >
        Inspection Started
      </h1>
      {startedAt != null && (
        <p
          className="anim-rise mt-1.5 text-sm text-white/70"
          style={{ animationDelay: "0.38s" }}
        >
          Started at {formatTime(startedAt)}
        </p>
      )}

      <div
        className="anim-rise mt-12 flex items-center gap-2.5 text-sm text-white/60"
        style={{ animationDelay: "0.5s" }}
      >
        <span className="size-4 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
        Loading inspection...
      </div>
    </div>
  );
}
