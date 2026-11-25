import { NextResponse } from "next/server";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { addDocuments } from "@/lib/store";
import { persistDocuments } from "@/lib/postgres";
import { getSessionRoomId } from "@/lib/session";
import type { SourceDocument } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 20;

function makeDocumentText(text: string, pageCount: number): string {
  const pages = text.split("\f").filter((page) => page.trim());
  const content = pages.length ? pages : [text];
  return content.map((page, index) => {
    const body = page.replace(/^PAGE\s+\d+\s*\|\s*/i, "").replace(/\s+/g, " ").trim();
    const clause = body.match(/^((?:\d+\.)+\d*\s+[^.]{1,120})\.\s*(.*)$/);
    const section = clause?.[1] || "Page excerpt";
    const excerpt = clause?.[2] || body;
    return `PAGE ${Math.min(index + 1, Math.max(pageCount, 1))} | ${section}. ${excerpt}`;
  }).join("\n");
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Upload form could not be read." }, { status: 400 });
  const roomId = getSessionRoomId(request);
  if (!roomId) return NextResponse.json({ error: "Your workspace session is missing. Refresh the page to start a new session." }, { status: 401 });
  const files = form.getAll("files").filter((value): value is File => value instanceof File);
  if (!files.length || files.length > MAX_FILES) {
    return NextResponse.json({ error: `Choose between 1 and ${MAX_FILES} documents per upload.` }, { status: 400 });
  }

  const documents: SourceDocument[] = [];
  for (const file of files) {
    const extension = file.name.toLowerCase().split(".").pop();
    if (!["pdf", "docx"].includes(extension || "") || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `${file.name} is not a supported PDF/DOCX under 20 MB.` }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;
    let pages = 1;
    try {
      if (extension === "pdf") {
        const parsed = await pdfParse(buffer, {
          pagerender: async (page: { getTextContent: (options: { normalizeWhitespace: boolean; disableCombineTextItems: boolean }) => Promise<{ items: Array<{ str?: string }> }> }) => {
            const content = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
            return `${content.items.map((item) => item.str || "").join(" ")}\f`;
          },
        });
        text = parsed.text;
        pages = parsed.numpages || 1;
      } else {
        const parsed = await mammoth.extractRawText({ buffer });
        text = parsed.value;
      }
    } catch {
      return NextResponse.json({ error: `${file.name} could not be parsed. Check that the file is a valid PDF or DOCX.` }, { status: 422 });
    }
    if (!text.trim()) return NextResponse.json({ error: `${file.name} contains no extractable text.` }, { status: 422 });
    documents.push({
      id: crypto.randomUUID(),
      name: file.name.slice(0, 180),
      type: extension === "pdf" ? "PDF" : "DOCX",
      pages,
      category: "Uploaded",
      content: makeDocumentText(text, pages),
    });
  }
  try {
    await persistDocuments(roomId, documents);
  } catch {
    return NextResponse.json({ error: "The document index could not store these files. Please check the configured database and embedding provider." }, { status: 503 });
  }
  await addDocuments(roomId, documents);
  return NextResponse.json({
    documents: documents.map(({ content: _content, ...document }) => document),
    status: "indexed",
  });
}
