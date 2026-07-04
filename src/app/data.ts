// ---- Property data -----------------------------------------------------------
// Zones, checklists and health dimensions are NOT defined here — they come from
// the inspection type configs in src/config. Properties only declare which
// optional features they have (e.g. "poolGarden").

export interface Property {
  id: string;
  name: string;
  code: string;
  kind: string;
  address: string;
  lastInspection: string;
  accessNotes: string;
  ownerNote?: string;
  /** Optional features that enable conditional zones (e.g. "poolGarden"). */
  features: string[];
}

/** Current inspector (auth comes later). */
export const inspector = "Walter Vallaster";

// ---- Dummy data ----------------------------------------------------------------

export const properties: Property[] = [
  {
    id: "p-014",
    name: "Villa Vista Mar",
    code: "P-014",
    kind: "Villa · 4 bed",
    address: "Carrer de la Mar 12, Jávea",
    lastInspection: "June 20, 2026",
    accessNotes: "Key box at side gate, code 4471. Alarm off. Gardener on site Fridays.",
    ownerNote: "Owners arrive July 18 — please check pool cover before then.",
    features: ["poolGarden"],
  },
  {
    id: "p-007",
    name: "Casa Olivo",
    code: "P-007",
    kind: "Townhouse · 2 bed",
    address: "Calle Olivo 3, Moraira",
    lastInspection: "June 28, 2026",
    accessNotes: "Smart lock — code in app. Cleaner finishes at 11:00.",
    features: [],
  },
  {
    id: "p-021",
    name: "Finca El Roble",
    code: "P-021",
    kind: "Finca · 5 bed",
    address: "Partida Benimarco 44, Benissa",
    lastInspection: "June 15, 2026",
    accessNotes: "Main gate remote in office. Dogs next door — keep gate closed.",
    ownerNote: "Irrigation timer was replaced in June — verify it runs at 15:30.",
    features: ["poolGarden"],
  },
];

