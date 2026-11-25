import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const globalForSession = globalThis as typeof globalThis & { lexroomSessionSecret?: string };
const secret = process.env.ROOM_SESSION_SECRET || (globalForSession.lexroomSessionSecret ??= randomBytes(32).toString("hex"));
const cookieName = "lexroom_room";

function signature(roomId: string): string {
  return createHmac("sha256", secret).update(roomId).digest("base64url");
}

export function getSessionRoomId(request: Request): string | null {
  const cookie = request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${cookieName}=`));
  if (!cookie) return null;
  const [roomId, suppliedSignature] = decodeURIComponent(cookie.slice(cookieName.length + 1)).split(".");
  if (!roomId || !suppliedSignature || !/^[a-zA-Z0-9-]{8,80}$/.test(roomId)) return null;
  const expected = signature(roomId);
  const supplied = Buffer.from(suppliedSignature);
  const actual = Buffer.from(expected);
  return supplied.length === actual.length && timingSafeEqual(supplied, actual) ? roomId : null;
}

export function createRoomSession(): string {
  return `room-${randomBytes(18).toString("hex")}`;
}

export function setRoomSessionCookie(response: Response, roomId: string, request: Request): void {
  const secure = new URL(request.url).protocol === "https:";
  response.headers.append(
    "set-cookie",
    `${cookieName}=${encodeURIComponent(`${roomId}.${signature(roomId)}`)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? "; Secure" : ""}`,
  );
}
