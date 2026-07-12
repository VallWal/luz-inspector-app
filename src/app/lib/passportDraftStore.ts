// ---- Passport draft persistence (IndexedDB) -----------------------------------------
// Same philosophy as the inspection draftStore: passport capture can span the
// whole visit AND the evening after — the draft survives reloads and stays
// until a confirmed (2xx) submission. Photos are stored as Blobs once
// (drafts reference them by key); fresh object URLs are minted on restore.
// Separate database from the inspection draft so the two never interfere.

import type {
  BaselinePhotoDraft,
  InventoryItem,
  PassportDraftState,
} from "@/types/passport";
import type { PhotoAttachment } from "@/types/inspection";

const DB_NAME = "luz-passport";
const DB_VERSION = 1;
const DRAFT_STORE = "draft";
const BLOB_STORE = "blobs";
const DRAFT_KEY = "current";

interface StoredPhoto {
  blobKey: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

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

function photoKey(scope: string, index: number): string {
  return `${scope}__${index}`;
}

function toStored(p: PhotoAttachment, key: string): StoredPhoto {
  return {
    blobKey: key,
    name: p.name,
    mimeType: p.mimeType,
    sizeBytes: p.sizeBytes,
  };
}

/** Persist the whole passport draft. Best-effort; never throws. */
export async function savePassportDraft(draft: PassportDraftState) {
  try {
    const db = await openDb();

    // 1. Persist any not-yet-stored photo blobs.
    const pending: { key: string; blob: Blob }[] = [];
    const collect = async (p: PhotoAttachment, key: string) => {
      if (storedBlobKeys.has(key)) return;
      const blob = await fetchBlob(p.localObjectUrl);
      if (blob) pending.push({ key, blob });
    };
    if (draft.specs.heroPhoto) await collect(draft.specs.heroPhoto, "hero");
    for (const it of draft.items) {
      for (let i = 0; i < it.photos.length; i++) {
        await collect(it.photos[i], photoKey(it.localId, i));
      }
    }
    for (const b of draft.baselinePhotos) {
      await collect(b.photo, `bl__${b.localId}`);
    }
    if (pending.length > 0) {
      const btx = db.transaction(BLOB_STORE, "readwrite");
      const store = btx.objectStore(BLOB_STORE);
      for (const { key, blob } of pending) store.put(blob, key);
      await txDone(btx);
      for (const { key } of pending) storedBlobKeys.add(key);
    }

    // 2. Persist the draft with blob keys instead of object URLs.
    const stored = {
      session: draft.session,
      specsChanged: draft.specsChanged,
      specs: {
        ...draft.specs,
        heroPhoto: draft.specs.heroPhoto
          ? toStored(draft.specs.heroPhoto, "hero")
          : null,
      },
      items: draft.items.map((it) => ({
        ...it,
        photos: it.photos.map((p, i) => toStored(p, photoKey(it.localId, i))),
      })),
      baselinePhotos: draft.baselinePhotos.map((b) => ({
        ...b,
        photo: toStored(b.photo, `bl__${b.localId}`),
      })),
      savedAt: Date.now(),
    };
    const dtx = db.transaction(DRAFT_STORE, "readwrite");
    dtx.objectStore(DRAFT_STORE).put(stored, DRAFT_KEY);
    await txDone(dtx);
    db.close();
  } catch (err) {
    console.warn("Passport draft persist failed", err);
  }
}

/** Load the persisted passport draft (fresh object URLs). Null when none. */
export async function loadPassportDraft(): Promise<PassportDraftState | null> {
  try {
    const db = await openDb();
    const tx = db.transaction([DRAFT_STORE, BLOB_STORE], "readonly");
    const stored = (await reqResult(
      tx.objectStore(DRAFT_STORE).get(DRAFT_KEY)
    )) as
      | (Omit<PassportDraftState, "specs" | "items" | "baselinePhotos"> & {
          specs: Omit<PassportDraftState["specs"], "heroPhoto"> & {
            heroPhoto: StoredPhoto | null;
          };
          items: (Omit<InventoryItem, "photos"> & { photos: StoredPhoto[] })[];
          baselinePhotos: (Omit<BaselinePhotoDraft, "photo"> & {
            photo: StoredPhoto;
          })[];
        })
      | undefined;
    if (!stored || !stored.session) {
      db.close();
      return null;
    }
    const blobStore = tx.objectStore(BLOB_STORE);
    const restore = async (sp: StoredPhoto): Promise<PhotoAttachment | null> => {
      const blob = (await reqResult(blobStore.get(sp.blobKey))) as
        | Blob
        | undefined;
      if (!blob) return null;
      storedBlobKeys.add(sp.blobKey);
      return {
        localObjectUrl: URL.createObjectURL(blob),
        name: sp.name,
        mimeType: sp.mimeType,
        sizeBytes: sp.sizeBytes,
      };
    };

    const heroPhoto = stored.specs.heroPhoto
      ? await restore(stored.specs.heroPhoto)
      : null;
    const items: InventoryItem[] = [];
    for (const it of stored.items) {
      const photos: PhotoAttachment[] = [];
      for (const sp of it.photos) {
        const p = await restore(sp);
        if (p) photos.push(p);
      }
      items.push({ ...it, photos });
    }
    const baselinePhotos: BaselinePhotoDraft[] = [];
    for (const b of stored.baselinePhotos) {
      const p = await restore(b.photo);
      if (p) baselinePhotos.push({ ...b, photo: p });
    }
    db.close();
    return {
      session: stored.session,
      specsChanged: stored.specsChanged,
      specs: { ...stored.specs, heroPhoto },
      items,
      baselinePhotos,
    };
  } catch (err) {
    console.warn("Passport draft load failed", err);
    return null;
  }
}

/** Remove the draft and its binaries — after a confirmed save or discard. */
export async function clearPassportDraft() {
  try {
    const db = await openDb();
    const tx = db.transaction([DRAFT_STORE, BLOB_STORE], "readwrite");
    tx.objectStore(DRAFT_STORE).delete(DRAFT_KEY);
    tx.objectStore(BLOB_STORE).clear();
    await txDone(tx);
    db.close();
    storedBlobKeys.clear();
  } catch (err) {
    console.warn("Passport draft clear failed", err);
  }
}
