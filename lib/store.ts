import { getStore } from "@netlify/blobs";
import { sampleDocuments } from "./demo-data";
import type { SourceDocument } from "./types";

type RoomStore = Map<string, SourceDocument[]>;

const globalForRooms = globalThis as typeof globalThis & { lexroomRooms?: RoomStore };
const rooms = globalForRooms.lexroomRooms ?? new Map<string, SourceDocument[]>();
globalForRooms.lexroomRooms = rooms;

function persistentStore() {
  return process.env.NETLIFY === "true" || process.env.NETLIFY_SITE_ID
    ? getStore("lexroom-room-documents")
    : null;
}

export async function getDocuments(roomId: string): Promise<SourceDocument[]> {
  const store = persistentStore();
  if (store) {
    const stored = await store.get(roomId, { type: "json" }) as SourceDocument[] | null;
    if (stored) {
      rooms.set(roomId, stored);
      return stored;
    }
    const defaults = sampleDocuments.map((doc) => ({ ...doc }));
    await store.setJSON(roomId, defaults);
    rooms.set(roomId, defaults);
    return defaults;
  }
  const documents = rooms.get(roomId);
  if (!documents) {
    const defaults = sampleDocuments.map((doc) => ({ ...doc }));
    rooms.set(roomId, defaults);
    return defaults;
  }
  return documents;
}

export async function addDocuments(roomId: string, documents: SourceDocument[]): Promise<void> {
  const current = await getDocuments(roomId);
  const ids = new Set(current.map((doc) => doc.id));
  const merged = [...current, ...documents.filter((doc) => !ids.has(doc.id))];
  const store = persistentStore();
  if (store) await store.setJSON(roomId, merged);
  rooms.set(roomId, merged);
}
