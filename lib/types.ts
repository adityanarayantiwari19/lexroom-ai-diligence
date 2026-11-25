export type SourceDocument = {
  id: string;
  name: string;
  type: string;
  pages: number;
  category: string;
  content: string;
  demo?: boolean;
};

export type Citation = {
  documentId: string;
  document: string;
  page: number;
  section: string;
  excerpt: string;
};

export type ChatAnswer = {
  answer: string;
  citations: Citation[];
  confidence: "high" | "medium" | "low";
  mode: "demo" | "ai";
};
