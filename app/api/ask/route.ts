import { NextResponse } from "next/server";
import { getDocuments } from "@/lib/store";
import { buildDemoAnswer, retrieve } from "@/lib/retrieval";
import { loadRoom, searchVectors } from "@/lib/postgres";
import { getSessionRoomId } from "@/lib/session";
import type { ChatAnswer, Citation, SourceDocument } from "@/lib/types";

export const runtime = "nodejs";

function streamedAnswer(answer: string, citations: Citation[], mode: ChatAnswer["mode"]): Response {
  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController<Uint8Array>, event: string, value: unknown) => {
    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`));
  };
  return new Response(new ReadableStream({
    async start(controller) {
      send(controller, "meta", { citations, mode });
      for (let offset = 0; offset < answer.length; offset += 42) {
        send(controller, "token", { text: answer.slice(offset, offset + 42) });
        await new Promise((resolve) => setTimeout(resolve, 18));
      }
      send(controller, "done", {});
      controller.close();
    },
  }), {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

export async function POST(request: Request) {
  let payload: { question?: unknown; stream?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const roomId = getSessionRoomId(request) || "";
  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  if (!roomId) return NextResponse.json({ error: "Your workspace session is missing. Refresh the page to start a new session." }, { status: 401 });
  if (!question || question.length > 2000) {
    return NextResponse.json({ error: "Provide a question of 1–2,000 characters." }, { status: 400 });
  }

  let documents: SourceDocument[];
  let citations: Citation[];
  try {
    documents = await loadRoom(roomId) || await getDocuments(roomId);
    const keywordCitations = retrieve(question, documents);
    const vectorCitations = await searchVectors(roomId, question);
    citations = [...vectorCitations, ...keywordCitations.filter((item) => !vectorCitations.some((match) => match.documentId === item.documentId && match.page === item.page))].slice(0, 5);
  } catch {
    return NextResponse.json({ error: "The document index is unavailable. Please try again or contact your workspace administrator." }, { status: 503 });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  let result: ChatAnswer = {
    answer: buildDemoAnswer(question, citations),
    citations,
    confidence: citations.length > 1 ? "high" : citations.length === 1 ? "medium" : "low",
    mode: "demo",
  };

  if (apiKey && citations.length) {
    const context = citations.map((citation, index) => `[${index + 1}] ${citation.document}, page ${citation.page}, ${citation.section}: ${citation.excerpt}`).join("\n");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
        max_tokens: 700,
        system: "Answer legal due diligence questions using only the supplied excerpts. Cite claims with the provided bracket numbers, such as [1]. Never create a citation, page, clause, or fact. If the excerpts do not establish an answer, say the data room does not contain enough information. This is not legal advice.",
        messages: [{ role: "user", content: `Question: ${question}\n\nSource excerpts:\n${context}` }],
      }),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "The configured AI provider could not answer this question." }, { status: 502 });
    }
    const body = await response.json() as { content?: Array<{ type: string; text?: string }> };
    const answer = body.content?.filter((part) => part.type === "text").map((part) => part.text || "").join("\n").trim();
    if (!answer) return NextResponse.json({ error: "The configured AI provider returned an empty answer." }, { status: 502 });
    result = { ...result, answer, mode: "ai" };
  }
  return payload.stream === true ? streamedAnswer(result.answer, result.citations, result.mode) : NextResponse.json(result);
}
