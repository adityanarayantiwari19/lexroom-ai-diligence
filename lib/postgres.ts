import { Pool } from "pg";
import { getDocuments } from "@/lib/store";
import type { Citation, SourceDocument } from "@/lib/types";

type StoredDocument = Omit<SourceDocument, "demo">;
type Chunk = { page: number; section: string; excerpt: string };
type VectorRow = { document_id: string; document: string; page: number; section: string; excerpt: string };

const globalForPool = globalThis as typeof globalThis & { lexroomPool?: Pool; lexroomSchema?: Promise<void> };

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  globalForPool.lexroomPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 10, idleTimeoutMillis: 30_000 });
  return globalForPool.lexroomPool;
}

async function ensureSchema(pool: Pool): Promise<void> {
  globalForPool.lexroomSchema ??= (async () => {
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lexroom_documents (
        room_id text NOT NULL,
        id text NOT NULL,
        name text NOT NULL,
        type text NOT NULL,
        pages integer NOT NULL,
        category text NOT NULL,
        content text NOT NULL,
        PRIMARY KEY (room_id, id)
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lexroom_chunks (
        room_id text NOT NULL,
        document_id text NOT NULL,
        chunk_index integer NOT NULL,
        page integer NOT NULL,
        section text NOT NULL,
        excerpt text NOT NULL,
        embedding vector(1536),
        PRIMARY KEY (room_id, document_id, chunk_index),
        FOREIGN KEY (room_id, document_id) REFERENCES lexroom_documents(room_id, id) ON DELETE CASCADE
      )
    `);
    await pool.query("CREATE INDEX IF NOT EXISTS lexroom_chunks_room_idx ON lexroom_chunks (room_id)");
    await pool.query("CREATE INDEX IF NOT EXISTS lexroom_chunks_vector_idx ON lexroom_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)");
  })();
  return globalForPool.lexroomSchema;
}

function parseChunks(document: SourceDocument): Chunk[] {
  return document.content.split(/\n+/).filter(Boolean).map((line) => {
    const match = line.match(/^PAGE\s+(\d+)\s*\|\s*(.*?)\.\s*(.*)$/i);
    return {
      page: Number(match?.[1] || 1),
      section: match?.[2]?.trim() || "Document excerpt",
      excerpt: (match?.[3] || line).trim(),
    };
  });
}

async function embed(texts: string[]): Promise<number[][] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !texts.length) return null;
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  if (!response.ok) throw new Error("The configured embedding provider could not index the document.");
  const result = await response.json() as { data?: Array<{ embedding: number[]; index: number }> };
  if (!result.data || result.data.length !== texts.length) throw new Error("The embedding provider returned an incomplete result.");
  return result.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}

export async function persistDocuments(roomId: string, documents: SourceDocument[]): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await ensureSchema(pool);
  for (const document of documents) {
    await pool.query(
      `INSERT INTO lexroom_documents (room_id, id, name, type, pages, category, content)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (room_id, id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type,
       pages = EXCLUDED.pages, category = EXCLUDED.category, content = EXCLUDED.content`,
      [roomId, document.id, document.name, document.type, document.pages, document.category, document.content],
    );
    const chunks = parseChunks(document);
    const embeddings = await embed(chunks.map((chunk) => `${chunk.section}\n${chunk.excerpt}`));
    await pool.query("DELETE FROM lexroom_chunks WHERE room_id = $1 AND document_id = $2", [roomId, document.id]);
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const vector = embeddings ? `[${embeddings[index].join(",")}]` : null;
      await pool.query(
        `INSERT INTO lexroom_chunks (room_id, document_id, chunk_index, page, section, excerpt, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7::vector)`,
        [roomId, document.id, index, chunk.page, chunk.section, chunk.excerpt, vector],
      );
    }
  }
}

export async function loadRoom(roomId: string): Promise<SourceDocument[] | null> {
  const pool = getPool();
  if (!pool) return null;
  await ensureSchema(pool);
  const result = await pool.query<StoredDocument>(
    "SELECT id, name, type, pages, category, content FROM lexroom_documents WHERE room_id = $1 ORDER BY name",
    [roomId],
  );
  if (result.rows.length) return result.rows;
  const samples = await getDocuments(roomId);
  await persistDocuments(roomId, samples);
  return samples;
}

export async function searchVectors(roomId: string, question: string): Promise<Citation[]> {
  const pool = getPool();
  if (!pool || !process.env.OPENAI_API_KEY) return [];
  await ensureSchema(pool);
  const [vector] = await embed([question]) || [];
  if (!vector) return [];
  const value = `[${vector.join(",")}]`;
  const result = await pool.query<VectorRow>(
    `SELECT document_id, document.name AS document, page, section, excerpt
     FROM lexroom_chunks
     JOIN lexroom_documents AS document
       ON document.room_id = lexroom_chunks.room_id AND document.id = lexroom_chunks.document_id
     WHERE lexroom_chunks.room_id = $1 AND embedding IS NOT NULL
     ORDER BY embedding <=> $2::vector
     LIMIT 5`,
    [roomId, value],
  );
  return result.rows.map((row) => ({
    documentId: row.document_id,
    document: row.document,
    page: row.page,
    section: row.section,
    excerpt: row.excerpt,
  }));
}
