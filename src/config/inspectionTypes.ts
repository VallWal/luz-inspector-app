import type { InspectionTypeConfig, InspectionZone } from "@/types/inspection";
import { regularCheck } from "./regularCheck";

/** Registry of all configured inspection types, keyed by id. */
export const INSPECTION_TYPES: Record<string, InspectionTypeConfig> = {
  [regularCheck.id]: regularCheck,
};

/**
 * Inspection types the inspector can start. Types without their own
 * zone config yet fall back to the Regular Check config.
 */
export const INSPECTION_TYPE_NAMES = [
  "Regular Check",
  "Storm Check",
  "Arrival Preparation",
  "Departure Reset",
  "Key Access",
] as const;

/**
 * Resolve an inspection type config by id or display title.
 * Unknown types fall back to the Regular Check config so the
 * app always has a valid zone/checklist structure to render.
 */
export function getInspectionConfig(idOrTitle: string): InspectionTypeConfig {
  const direct = INSPECTION_TYPES[idOrTitle];
  if (direct) return direct;
  const byTitle = Object.values(INSPECTION_TYPES).find(
    (c) => c.title.toLowerCase() === idOrTitle.toLowerCase()
  );
  return byTitle ?? regularCheck;
}

/**
 * Zones applicable to a property: zones with `requiresFeature`
 * (e.g. Pool / Garden) are only included when the property has
 * that feature.
 */
export function getZonesForProperty(
  config: InspectionTypeConfig,
  features: string[] = []
): InspectionZone[] {
  return config.zones.filter(
    (z) => !z.requiresFeature || features.includes(z.requiresFeature)
  );
}
