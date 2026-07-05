import { notesForProperty, type NoteType, type PropertyNote } from "../data";

/** Fixed display order + styling per note type. */
const NOTE_GROUPS: {
  type: NoteType;
  title: string;
  icon: string;
  accent: string;
  chip: string;
}[] = [
  {
    type: "Instructions",
    title: "Instructions",
    icon: "📋",
    accent: "border-navy/15",
    chip: "bg-beige text-navy/70",
  },
  {
    type: "Property Access",
    title: "Property Access",
    icon: "🔑",
    accent: "border-status-green/25",
    chip: "bg-status-green-soft text-status-green",
  },
  {
    type: "Problematic Area",
    title: "Problematic Areas",
    icon: "⚠️",
    accent: "border-status-yellow/30",
    chip: "bg-status-yellow-soft text-status-yellow",
  },
];

function NoteCard({ note, accent }: { note: PropertyNote; accent: string }) {
  return (
    <li
      className={`rounded-2xl border ${accent} bg-beige-soft px-4 py-3 text-sm leading-snug text-navy/80`}
    >
      {note.summary}
      {note.photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={note.photo}
          alt="Note photo"
          className="mt-2 h-24 w-full rounded-xl object-cover"
        />
      )}
    </li>
  );
}

/**
 * Property-related notes shown before starting an inspection —
 * important field guidance grouped by type. Mock data for now.
 */
export default function PropertyNotes({ propertyId }: { propertyId: string }) {
  const notes = notesForProperty(propertyId);
  if (notes.length === 0) return null;

  return (
    <section className="mx-5 mt-4 rounded-3xl bg-white px-6 py-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-navy/50">
        Property Notes
      </p>

      <div className="mt-3 flex flex-col gap-4">
        {NOTE_GROUPS.map((group) => {
          const groupNotes = notes.filter((n) => n.type === group.type);
          if (groupNotes.length === 0) return null;
          return (
            <div key={group.type}>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${group.chip}`}
              >
                <span aria-hidden>{group.icon}</span>
                {group.title}
              </span>
              <ul className="mt-2 flex flex-col gap-2">
                {groupNotes.map((note) => (
                  <NoteCard key={note.noteId} note={note} accent={group.accent} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
