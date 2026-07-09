// ---- Inspection flow configuration -------------------------------------------
// There are NO hardcoded inspection items here. The Airtable "Inspection
// Items" table is the single source of truth: items are fetched at app start
// (lib/appData.ts), filtered by "Applies To" for the selected inspection type
// and grouped by Health Category. Only the category order and their short
// reminder lines are defined in the app.

import { HEALTH_CATEGORIES, type InspectionZone } from "@/types/inspection";
import { getInspectionItems } from "@/app/data";

/** The four inspection types — exactly the Airtable "Inspection Type" and
 * "Applies To" option names. No mapping layer needed. */
export const INSPECTION_TYPE_NAMES = [
  "Regular Inspection",
  "Post-Storm Inspection",
  "Owner Arrival Preparation",
  "Owner Departure Reset",
] as const;

/** Short reminder line under each category title. */
const CATEGORY_REMINDERS: Record<string, string> = {
  "Utilities & Systems":
    "Power, water, hot water, internet, climate and pool equipment.",
  "Access & Security":
    "Entrances, locks, windows, alarm and any signs of intrusion.",
  "Water & Humidity": "Leaks, damp, mould, ventilation and standing water.",
  "Building Interior/Exterior":
    "Structure, surfaces, cleanliness and signs of pests.",
  "Outdoor Areas": "Garden, terraces, pool surroundings and boundaries.",
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * The category steps for one inspection: each Health Category with the
 * Airtable inspection items whose "Applies To" contains the selected type.
 * Categories without items for this type are skipped.
 */
export function zonesForInspection(inspectionType: string): InspectionZone[] {
  const items = getInspectionItems().filter((i) =>
    i.appliesTo.includes(inspectionType)
  );
  return HEALTH_CATEGORIES.map((category) => ({
    id: slug(category),
    title: category,
    reminder: CATEGORY_REMINDERS[category] ?? "",
    checklist: items
      .filter((i) => i.healthCategory === category)
      .map((i) => ({
        recordId: i.recordId,
        itemId: i.itemId,
        label: i.item,
        guidance: i.guidance,
      })),
  })).filter((zone) => zone.checklist.length > 0);
}
