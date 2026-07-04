/** Clock time from epoch ms, e.g. "09:42". */
export function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/** Human-readable duration, e.g. "24 min", "1 h 5 min". */
export function formatDuration(totalSec: number): string {
  if (totalSec < 60) return "< 1 min";
  const mins = Math.round(totalSec / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}
