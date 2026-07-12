// ---- Passport capture UI configuration ----------------------------------------
// One config drives all four inventory sections — the section screens and the
// add/edit sheet are generic. Field keys match the payload keys n8n maps to
// Airtable columns.

import {
  APPLIANCE_TYPES,
  CONTACT_TYPES,
  NOTE_TYPES,
  UTILITY_TYPES,
  type InventoryKind,
} from "@/types/passport";

export interface FieldDef {
  key: string;
  label: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  placeholder?: string;
}

export interface InventoryConfig {
  kind: InventoryKind;
  title: string;
  emoji: string;
  addLabel: string;
  /** Type select options; null = the section has no type (Key Inventory). */
  types: readonly string[] | null;
  hasPhotos: boolean;
  /** Photo-first AI extraction available (utilities/appliances). */
  aiExtract: boolean;
  fields: FieldDef[];
}

export const INVENTORY_CONFIGS: Record<InventoryKind, InventoryConfig> = {
  utility: {
    kind: "utility",
    title: "Utilities & Meters",
    emoji: "⚡",
    addLabel: "Add Utility",
    types: UTILITY_TYPES,
    hasPhotos: true,
    aiExtract: true,
    fields: [
      { key: "provider", label: "Provider" },
      { key: "model", label: "Model" },
      { key: "meterNo", label: "Meter No." },
      { key: "quantity", label: "Quantity", inputMode: "numeric" },
      { key: "location", label: "Location", placeholder: "e.g. Garage wall" },
    ],
  },
  appliance: {
    kind: "appliance",
    title: "Appliances & Systems",
    emoji: "🔧",
    addLabel: "Add Appliance",
    types: APPLIANCE_TYPES,
    hasPhotos: true,
    aiExtract: true,
    fields: [
      { key: "brand", label: "Brand" },
      { key: "model", label: "Model" },
      { key: "installed", label: "Installed", placeholder: "e.g. 2019" },
      { key: "location", label: "Location", placeholder: "e.g. Kitchen" },
    ],
  },
  contact: {
    kind: "contact",
    title: "Important Contacts",
    emoji: "📇",
    addLabel: "Add Contact",
    types: CONTACT_TYPES,
    hasPhotos: false,
    aiExtract: false,
    fields: [
      { key: "company", label: "Company" },
      { key: "contactPerson", label: "Contact Person" },
      { key: "phone", label: "Phone", inputMode: "tel" },
      { key: "email", label: "Email", inputMode: "email" },
    ],
  },
  key: {
    kind: "key",
    title: "Keys",
    emoji: "🔑",
    addLabel: "Add Key",
    types: null,
    hasPhotos: false,
    aiExtract: false,
    fields: [
      { key: "keyTag", label: "Key Tag", placeholder: "e.g. K-01 Main door" },
      { key: "storageLocation", label: "Storage Location" },
      { key: "notes", label: "Notes" },
    ],
  },
  note: {
    kind: "note",
    title: "Property Notes",
    emoji: "📝",
    addLabel: "Add Note",
    types: NOTE_TYPES,
    hasPhotos: true,
    aiExtract: false,
    fields: [
      {
        key: "summary",
        label: "Note",
        placeholder: "e.g. Key box at side gate, code 4471",
      },
    ],
  },
};

/** Display line for an inventory card, e.g. "Vaillant · ecoTEC · Garage". */
export function itemSummary(
  cfg: InventoryConfig,
  fields: Record<string, string>
): string {
  return cfg.fields
    .map((f) => (fields[f.key] || "").trim())
    .filter((v) => v !== "")
    .slice(0, 3)
    .join(" · ");
}
