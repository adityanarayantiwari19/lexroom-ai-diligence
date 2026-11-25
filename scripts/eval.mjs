import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/demo-data.ts", import.meta.url), "utf8");
const documents = [...source.matchAll(/id: "([^"]+)"[\s\S]*?content: `([\s\S]*?)`,/g)]
  .map(([, id, content]) => ({ id, content }));

const cases = [
  ["Which contracts have change of control clauses?", ["northstar-spa", "meridian-lease"]],
  ["Can the SPA be assigned after an acquisition?", ["northstar-spa"]],
  ["Does the lease require consent for a transfer?", ["meridian-lease"]],
  ["What is the convenience termination notice?", ["northstar-spa"]],
  ["How long is the cure period for material breach?", ["northstar-spa"]],
  ["Can the tenant terminate early?", ["meridian-lease"]],
  ["How much notice does the lease termination option need?", ["meridian-lease"]],
  ["Which state's law governs the SPA?", ["northstar-spa"]],
  ["What is the governing law for the office lease?", ["meridian-lease"]],
  ["Which law applies to the mutual NDA?", ["atlas-nda"]],
  ["What is the purchase price?", ["northstar-spa"]],
  ["How long do confidentiality obligations survive?", ["atlas-nda"]],
  ["How are trade secrets treated after the NDA expires?", ["atlas-nda"]],
  ["What is the term of the NDA?", ["atlas-nda"]],
  ["How large are the leased premises?", ["meridian-lease"]],
  ["When does the initial lease term expire?", ["meridian-lease"]],
  ["When does the Northstar agreement require assignment notice?", ["northstar-spa"]],
  ["How many days does the SPA allow to notify after a corporate reorganization?", ["northstar-spa"]],
  ["How much notice is required to terminate the NDA?", ["atlas-nda"]],
  ["What are the insurance coverage limits and policy exclusions?", []],
];
const stopWords = new Set(["the", "and", "for", "are", "does", "what", "which", "with", "have", "has", "how", "can", "that", "this", "from", "when", "where", "who", "into", "about", "all", "each", "any", "its", "their", "they", "after", "before", "there", "apply", "applies"]);
const words = (value) => value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word));

for (const [question, expectedIds] of cases) {
  const queryTerms = words(question);
  const matches = documents.map((document) => ({
    id: document.id,
    score: queryTerms.reduce((score, term) => score + (document.content.toLowerCase().includes(term) ? 1 : 0), 0),
  })).filter((document) => document.score > 0).sort((a, b) => b.score - a.score);
  for (const id of expectedIds) {
    assert(matches.some((match) => match.id === id), `Expected ${id} for: ${question}`);
  }
  if (!expectedIds.length) assert.equal(matches.length, 0, `Expected no source for: ${question}`);
}

console.log(`Passed ${cases.length} demo retrieval checks.`);
