import { NextResponse } from "next/server";
import { getDocuments } from "@/lib/store";
import { loadRoom } from "@/lib/postgres";
import { createRoomSession, getSessionRoomId, setRoomSessionCookie } from "@/lib/session";

export async function GET(request: Request) {
  const roomId = getSessionRoomId(request) || createRoomSession();
  let documents;
  try {
    documents = (await loadRoom(roomId) || await getDocuments(roomId)).map(({ content: _content, ...document }) => document);
  } catch {
    return NextResponse.json({ error: "The document index is unavailable." }, { status: 503 });
  }
  const response = NextResponse.json({ roomId, documents });
  setRoomSessionCookie(response, roomId, request);
  return response;
}
