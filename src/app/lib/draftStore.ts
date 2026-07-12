// ---- IndexedDB draft persistence -------------------------------------------------
// An in-progress inspection must survive a tab reload, phone lock or crash —
// permanent digital history beats everything. The session state is persisted
// after every change; photo/voice binaries are stored ONCE per finding (they
// are immutable after save) in a separate blob store. On restore, fresh
// object URLs are minted from the stored blobs.
//
// The draft is cleared only after a CONFIRMED (2xx) submission to n8n.

import type {
  Finding,
  InspectionSession,
  ZoneStatus,
} from "@/types/inspection";

const DB_NAME = "luz-inspector";
const DB_VERSION = 1;
const DRAFT_STORE = "draft";
const BLOB_STORE = "blobs";
/** Single-draft model: one active inspection at a time. */
const DRAFT_KEY = "current";

// ---- Serialized shapes (what actually lives in IndexedDB) -----------------------

interface StoredPhoto {
  blobKey: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

interface StoredVoice {
  blobKey: string;
  durationSec: number;
  mimeType: string;
  sizeBytes: number;
}

interface StoredFinding
  extends Omit<Finding, "photos" | "voiceRecording"> {
  photos: StoredPhoto[];
  voiceRecording: StoredVoice | null;
}

export interface InspectionDraft {
  session: InspectionSession;
  zoneStatuses: ZoneStatus[];
  zoneIndex: number;
  zoneDurations: number[];
  findings: Finding[];
  /** Open findings (record ids) marked as fixed during this inspection. */
  resolvedFindingIds: string[];
  /** Epoch ms of the last persist — shown on the resume card if wanted. */
  savedAt: number;
}

interface StoredDraft
  extends Omit<InspectionDraft, "findings"> {
  findings: StoredFinding[];
}

// ---- IndexedDB plumbing -----------------------------------------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE);
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB tx failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB tx aborted"));
  });
}

function reqResult<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB req failed"));
  });
}

/** Blob keys already persisted this session — findings are immutable after
 * save, so each binary is written exactly once. */
const storedBlobKeys = new Set<string>();

async function fetchBlob(objectUrl: string): Promise<Blob | null> {
  try {
    const res = await fetch(objectUrl);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

// ---- Public API --------------------------------------------------------------------

/** Persist the current inspection state. Safe to call often — binaries are
 * only written the first time each finding is seen. Never throws. */
export async function saveDraft(draft: Omit<InspectionDraft, "savedAt">) {
  try {
    const db = await openDb();

    // 1. Store any new binaries (outside the draft transaction — fetching
    //    object URLs is async and IndexedDB transactions auto-close).
    const pending: { key: string; blob: Blob }[] = [];
    for (const f of draft.findings) {
      for (let i = 0; i < f.photos.length; i++) {
        const key = `${f.findingId}__photo__${i}`;
        if (storedBlobKeys.has(key)) continue;
        const blob = await fetchBlob(f.photos[i].localObjectUrl);
        if (blob) pending.push({ key, blob });
      }
      if (f.voiceRecording) {
        const key = `${f.findingId}__voice`;
        if (!storedBlobKeys.has(key)) {
          const blob = await fetchBlob(f.voiceRecording.localObjectUrl);
          if (blob) pending.push({ key, blob });
        }
      }
    }
    if (pending.length > 0) {
      const btx = db.transaction(BLOB_STORE, "readwrite");
      const store = btx.objectStore(BLOB_STORE);
      for (const { key, blob } of pending) store.put(blob, key);
      await txDone(btx);
      for (const { key } of pending) storedBlobKeys.add(key);
    }

    // 2. Store the draft itself (blob keys instead of object URLs).
    const stored: StoredDraft = {
      session: draft.session,
      zoneStatuses: draft.zoneStatuses,
      zoneIndex: draft.zoneIndex,
      zoneDurations: draft.zoneDurations,
      resolvedFindingIds: draft.resolvedFindingIds ?? [],
      savedAt: Date.now(),
      findings: draft.findings.map(
        (f): StoredFinding => ({
          ...f,
          photos: f.photos.map((p, i) => ({
            blobKey: `${f.findingId}__photo__${i}`,
            name: p.name,
            mimeType: p.mimeType,
            sizeBytes: p.sizeBytes,
          })),
          voiceRecording: f.voiceRecording
            ? {
                blobKey: `${f.findingId}__voice`,
                durationSec: f.voiceRecording.durationSec,
                mimeType: f.voiceRecording.mimeType,
                sizeBytes: f.voiceRecording.sizeBytes,
              }
            : null,
        })
      ),
    };
    const dtx = db.transaction(DRAFT_STORE, "readwrite");
    dtx.objectStore(DRAFT_STORE).put(stored, DRAFT_KEY);
    await txDone(dtx);
    db.close();
  } catch (err) {
    // Persistence is best-effort — never break the inspection over it.
    console.warn("Draft persist failed", err);
  }
}

/** Load a previously persisted in-progress inspection, minting fresh object
 * URLs for all stored binaries. Returns null when there is no usable draft. */
export async function loadDraft(): Promise<InspectionDraft | null> {
  try {
    const db = await openDb();
    const tx = db.transaction([DRAFT_STORE, BLOB_STORE], "readonly");
    const stored = (await reqResult(
      tx.objectStore(DRAFT_STORE).get(DRAFT_KEY)
    )) as StoredDraft | undefined;
    if (!stored || stored.session?.status !== "In Progress") {
      db.close();
      return null;
    }
    const blobStore = tx.objectStore(BLOB_STORE);
    const findings: Finding[] = [];
    for (const f of stored.findings) {
      const photos = [];
      for (const p of f.photos) {
        const blob = (await reqResult(blobStore.get(p.blobKey))) as
          | Blob
          | undefined;
        if (!blob) continue; // binary lost — keep the finding, drop the file
        storedBlobKeys.add(p.blobKey);
        photos.push({
          localObjectUrl: URL.createObjectURL(blob),
          name: p.name,
          mimeType: p.mimeType,
          sizeBytes: p.sizeBytes,
        });
      }
      let voiceRecording = null;
      if (f.voiceRecording) {
        const blob = (await reqResult(
          blobStore.get(f.voiceRecording.blobKey)
        )) as Blob | undefined;
        if (blob) {
          storedBlobKeys.add(f.voiceRecording.blobKey);
          voiceRecording = {
            localObjectUrl: URL.createObjectURL(blob),
            durationSec: f.voiceRecording.durationSec,
            mimeType: f.voiceRecording.mimeType,
            sizeBytes: f.voiceRecording.sizeBytes,
          };
        }
      }
      findings.push({ ...f, photos, voiceRecording });
    }
    db.close();
    return {
      session: stored.session,
      zoneStatuses: stored.zoneStatuses,
      zoneIndex: stored.zoneIndex,
      zoneDurations: stored.zoneDurations,
      findings,
      resolvedFindingIds: stored.resolvedFindingIds ?? [],
      savedAt: stored.savedAt,
    };
  } catch (err) {
    console.warn("Draft load failed", err);
    return null;
  }
}

/** Remove the draft and all stored binaries — call ONLY after a confirmed
 * (2xx) submission, or when the inspector explicitly discards. */
export async function clearDraft() {
  try {
    const db = await openDb();
    const tx = db.transaction([DRAFT_STORE, BLOB_STORE], "readwrite");
    tx.objectStore(DRAFT_STORE).delete(DRAFT_KEY);
    tx.objectStore(BLOB_STORE).clear();
    await txDone(tx);
    db.close();
    storedBlobKeys.clear();
  } catch (err) {
    console.warn("Draft clear failed", err);
  }
}
