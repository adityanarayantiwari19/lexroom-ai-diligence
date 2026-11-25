import type { Citation, SourceDocument } from "./types";

const stopWords = new Set(["the", "and", "for", "are", "does", "what", "which", "with", "have", "has", "how", "can", "that", "this", "from", "when", "where", "who", "into", "about", "all", "each", "any", "its", "their", "they", "after", "before", "there", "apply", "applies"]);
const terms = (query: string) =>
  query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word));

export function retrieve(query: string, documents: SourceDocument[]): Citation[] {
  const queryTerms = terms(query);
  const candidates = documents.flatMap((document) =>
    document.content.split(/\n+/).map((line) => {
      const match = line.match(/^PAGE\s+(\d+)\s*\|\s*([^.]*(?:\.[^.]*)?)\.\s*(.*)$/i);
      const page = Number(match?.[1] ?? 1);
      const section = match?.[2]?.trim() || "Document excerpt";
      const excerpt = (match?.[3] || line).trim();
      const haystack = `${section} ${excerpt}`.toLowerCase();
      const score = queryTerms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      return { document, page, section, excerpt, score };
    }),
  );

  return candidates
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ document, page, section, excerpt }) => ({
      documentId: document.id,
      document: document.name,
      page,
      section,
      excerpt,
    }));
}

export function buildDemoAnswer(question: string, citations: Citation[]): string {
  if (!citations.length) return "I couldn't find this information in the documents currently in this data room. Try a more specific question or add the relevant document.";
  const q = question.toLowerCase();
  const snippets = citations.slice(0, 3).map((citation) => `“${citation.excerpt}”`);
  const intro = q.includes("change") || q.includes("control")
    ? "I found change-of-control and assignment language in the data room:"
    : q.includes("terminat")
      ? "Here are the termination rights I found:"
      : q.includes("govern")
        ? "The governing-law provisions state:"
        : "Based on the documents in this data room:";
  return `${intro} ${snippets.join(" ")}`;
}
