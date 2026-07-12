// ---- Passport submission + AI photo reading (n8n) ----------------------------------
// Submit: multipart POST — "payload" JSON field + photo binaries:
//   photo__<itemLocalId>__<n>   inventory photos (utilities/appliances)
//   baseline__<localId>         one binary per baseline photo record
//   hero                        new Properties.Property Image (optional)
// n8n dedupes on passportId, updates the Property, upserts child records,
// creates one Photos Baseline record per baseline photo (incl. Captured On),
// uploads all binaries and logs an Inspection of type "Property Passport".
//
// Extract: POST one photo to the vision webhook → structured fields
// (brand/model/provider/meterNo/…) read off the nameplate or meter.

import type {
  BaselinePhotoDraft,
  ExtractedFields,
  InventoryItem,
  PassportSession,
  PropertySpecs,
} from "@/types/passport";
import { compressPhoto } from "./submission";

/** Production webhook of "Luz - Passport Submit - CLAUDE". */
export const N8N_PASSPORT_SUBMIT_URL =
  "https://automation.vallendiz.com/webhook/luz-passport-submit";

/** Production webhook of "Luz - Passport Extract - CLAUDE" (OpenAI vision). */
export const N8N_PASSPORT_EXTRACT_URL =
  "https://automation.vallendiz.com/webhook/luz-passport-extract";

export const PASSPORT_SCHEMA_VERSION = "1.0";

export interface PassportSubmissionResult {
  status: number;
  body: string;
}

async function blobFromObjectUrl(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

function jpegName(name: string, fallback: string): string {
  const base = (name || fallback).replace(/\.[A-Za-z0-9]+$/, "");
  return `${base}.jpg`;
}

export function buildPassportPayload(input: {
  session: PassportSession;
  specs: PropertySpecs;
  specsChanged: boolean;
  items: InventoryItem[];
  baselinePhotos: BaselinePhotoDraft[];
}) {
  const { session, specs, specsChanged, items, baselinePhotos } = input;
  return {
    schemaVersion: PASSPORT_SCHEMA_VERSION,
    passport: {
      passportId: session.passportId,
      propertyId: session.propertyId,
      propertyName: session.propertyName,
      inspector: session.inspector,
      startedAt: new Date(session.startedAt).toISOString(),
      submittedAt: new Date().toISOString(),
    },
    // Always the full spec set (pre-filled from Airtable) — n8n writes all.
    specs: specsChanged
      ? {
          propertyType: specs.propertyType,
          constructionYear: specs.constructionYear,
          floorArea: specs.floorArea,
          plotSize: specs.plotSize,
          floors: specs.floors,
          bedrooms: specs.bedrooms,
          bathrooms: specs.bathrooms,
          features: specs.features,
        }
      : null,
    hasHeroPhoto: specs.heroPhoto != null,
    // Only new records and edited existing ones travel.
    items: items
      .filter((it) => it.recordId === null || it.dirty || it.photos.length > 0)
      .map((it) => ({
        localId: it.localId,
        recordId: it.recordId,
        kind: it.kind,
        type: it.type,
        fields: it.fields,
        photoCount: it.photos.length,
      })),
    baselinePhotos: baselinePhotos.map((b) => ({
      localId: b.localId,
      type: b.type,
      title: b.title,
      location: b.location,
      capturedOn: b.capturedOn,
    })),
  };
}

/** POSTs the passport payload + all photo binaries as multipart/form-data. */
export async function submitPassport(input: {
  session: PassportSession;
  specs: PropertySpecs;
  specsChanged: boolean;
  items: InventoryItem[];
  baselinePhotos: BaselinePhotoDraft[];
}): Promise<PassportSubmissionResult> {
  const payload = buildPassportPayload(input);
  const form = new FormData();
  form.append("payload", JSON.stringify(payload));

  if (input.specs.heroPhoto) {
    const blob = await blobFromObjectUrl(input.specs.heroPhoto.localObjectUrl);
    if (blob) {
      form.append(
        "hero",
        await compressPhoto(blob),
        jpegName(input.specs.heroPhoto.name, "property-image")
      );
    }
  }

  for (const item of input.items) {
    for (let i = 0; i < item.photos.length; i++) {
      const blob = await blobFromObjectUrl(item.photos[i].localObjectUrl);
      if (blob) {
        form.append(
          `photo__${item.localId}__${i}`,
          await compressPhoto(blob),
          jpegName(item.photos[i].name, `${item.localId}-${i}`)
        );
      }
    }
  }

  for (const b of input.baselinePhotos) {
    const blob = await blobFromObjectUrl(b.photo.localObjectUrl);
    if (blob) {
      form.append(
        `baseline__${b.localId}`,
        await compressPhoto(blob),
        jpegName(b.photo.name, b.localId)
      );
    }
  }

  const res = await fetch(N8N_PASSPORT_SUBMIT_URL, {
    method: "POST",
    body: form,
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`Webhook responded ${res.status}: ${body.slice(0, 200)}`);
  }
  return { status: res.status, body };
}

/**
 * Sends one photo to the OpenAI-vision webhook and returns the structured
 * fields it could read (nameplate, meter, sticker). Throws on failure —
 * the caller falls back to manual typing.
 */
export async function extractFieldsFromPhoto(input: {
  photoObjectUrl: string;
  photoName: string;
  kind: "utility" | "appliance";
  typeHint: string;
}): Promise<ExtractedFields> {
  const blob = await blobFromObjectUrl(input.photoObjectUrl);
  if (!blob) throw new Error("Photo unavailable");
  const form = new FormData();
  form.append("kind", input.kind);
  form.append("typeHint", input.typeHint);
  form.append(
    "photo",
    await compressPhoto(blob),
    jpegName(input.photoName, "extract")
  );
  const res = await fetch(N8N_PASSPORT_EXTRACT_URL, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Extract endpoint responded ${res.status}`);
  }
  const data = await res.json();
  const out: ExtractedFields = {};
  for (const key of [
    "brand",
    "model",
    "provider",
    "meterNo",
    "installed",
    "quantity",
    "location",
  ] as const) {
    const v = data?.[key];
    if (typeof v === "string" && v.trim() !== "") out[key] = v.trim();
  }
  return out;
}
