"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownToLine, ArrowLeft, ArrowUp, Check, ChevronDown, ChevronRight, CircleHelp, FilePlus2, FileText, FolderClosed, Menu, MessageSquareText, MoreHorizontal, PanelRightClose, Plus, Search, ShieldCheck, Sparkles, Table2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { sampleDocuments } from "@/lib/demo-data";
import type { ChatAnswer, Citation, SourceDocument } from "@/lib/types";

type Message = { id: string; role: "user" | "assistant"; text: string; citations?: Citation[]; mode?: string };
const starterQuestions = ["Which contracts have change-of-control clauses?", "List all termination rights and notice periods.", "What governing law applies to each agreement?"];
function IconButton({ label, onClick, children, className = "" }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return <button aria-label={label} onClick={onClick} className={`rounded-lg p-2 text-white/40 transition hover:bg-white/[.07] hover:text-white ${className}`}>{children}</button>;
}

function RiskBadge({ risk, reason }: { risk: "Low" | "Medium" | "High" | null; reason?: string }) {
  if (!risk) return <span className="rounded-full border border-white/10 bg-white/[.04] px-2 py-1 text-[9px] text-white/40">Not assessed</span>;
  const styles = risk === "High" ? "border-rose-300/20 bg-rose-300/10 text-rose-200" : risk === "Medium" ? "border-amber-200/20 bg-amber-200/10 text-amber-100" : "border-emerald-200/20 bg-emerald-200/10 text-emerald-100";
  return <span title={reason} className={`rounded-full border px-2 py-1 text-[9px] ${styles}`}>{risk} risk</span>;
}

export function Workspace() {
  const [roomId, setRoomId] = useState("");
  const [documents, setDocuments] = useState<SourceDocument[]>(sampleDocuments);
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadState, setUploadState] = useState("");
  const [mode, setMode] = useState<"chat" | "table">("chat");
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const uploadTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);
  useEffect(() => () => { if (uploadTimer.current) clearInterval(uploadTimer.current); }, []);
  useEffect(() => {
    setViewerOpen(window.matchMedia("(min-width: 1280px)").matches);
  }, []);
  useEffect(() => {
    fetch("/api/room")
      .then(async (response) => {
        const data = await response.json() as { roomId?: string; documents?: SourceDocument[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Could not load this room.");
        if (data.roomId) setRoomId(data.roomId);
        if (data.documents?.length) setDocuments([...sampleDocuments, ...data.documents.filter((doc) => !sampleDocuments.some((sample) => sample.id === doc.id))]);
        setLoaded(true);
      })
      .catch((caught) => { setError(caught instanceof Error ? caught.message : "Could not load this room."); setLoaded(true); });
  }, []);

  const ask = useCallback(async (value = question) => {
    const prompt = value.trim();
    if (!prompt || busy || !roomId) return;
    setError("");
    setQuestion("");
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", text: prompt }]);
    setBusy(true);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: prompt, stream: true }),
      });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error || "Could not answer that question.");
      }
      if (!response.body) throw new Error("The answer stream was unavailable.");
      const assistantId = crypto.randomUUID();
      setMessages((current) => [...current, { id: assistantId, role: "assistant", text: "" }]);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const handleEvent = (frame: string) => {
        const lines = frame.split(/\r?\n/);
        const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
        const data = lines.filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
        if (!event || !data) return;
        const parsed = JSON.parse(data) as { text?: string; citations?: Citation[]; mode?: string };
        if (event === "meta") {
          setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, citations: parsed.citations, mode: parsed.mode } : message));
          if (parsed.citations?.[0]) { setSelectedCitation(parsed.citations[0]); setViewerOpen(true); }
        } else if (event === "token" && parsed.text) {
          setMessages((current) => current.map((message) => message.id === assistantId ? { ...message, text: message.text + parsed.text } : message));
        }
      };
      while (true) {
        const { done, value: chunk } = await reader.read();
        buffer += decoder.decode(chunk, { stream: !done });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() || "";
        frames.forEach(handleEvent);
        if (done) break;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }, [busy, question, roomId]);

  async function uploadFiles(files: FileList | File[]) {
    const selected = Array.from(files);
    if (!selected.length || !roomId) return;
    setError("");
    setBusy(true);
    const stages = ["Reading files…", "Parsing pages…", "Chunking clauses…", "Indexing room…"];
    let stage = 0;
    setUploadState(stages[stage]);
    uploadTimer.current = setInterval(() => { stage = Math.min(stage + 1, stages.length - 1); setUploadState(stages[stage]); }, 650);
    const form = new FormData();
    selected.forEach((file) => form.append("files", file));
    try {
      const response = await fetch("/api/ingest", { method: "POST", body: form });
      const result = await response.json() as { documents?: SourceDocument[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      if (result.documents?.length) setDocuments((current) => [...current, ...result.documents!]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed. Please try again.");
    } finally {
      if (uploadTimer.current) clearInterval(uploadTimer.current);
      uploadTimer.current = null;
      setUploadState("");
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const visibleDocs = documents.filter((doc) => doc.name.toLowerCase().includes(search.toLowerCase()));
  const currentDoc = selectedCitation ? documents.find((doc) => doc.id === selectedCitation.documentId) : documents[0];
  const currentText = selectedCitation?.excerpt || currentDoc?.content.split("\n")[0]?.replace(/^PAGE.*?\|\s*/, "") || "Choose a citation to view its supporting language.";
  const citation = (documentId: string, document: string, page: number, section: string, excerpt: string): Citation => ({ documentId, document, page, section, excerpt });
  const reviewExamples: Array<{
    doc: string; term: string; termination: string; change: string; law: string;
    risk: "Low" | "Medium" | "High"; riskReason: string;
    citations: Partial<Record<"term" | "termination" | "change" | "law", Citation[]>>;
  }> = [
    {
      doc: "Northstar_SPA_Executed.pdf", term: "Purchase agreement", termination: "90 days' notice; 30-day cure",
      change: "Assignment on merger / sale", law: "Delaware", risk: "Medium", riskReason: "Broad assignment rights following a merger or asset sale.",
      citations: {
        term: [citation("northstar-spa", "Northstar_SPA_Executed.pdf", 8, "4.1 Purchase Price", "The aggregate purchase price is $24,500,000, subject to the adjustments set forth in Section 4.")],
        termination: [
          citation("northstar-spa", "Northstar_SPA_Executed.pdf", 28, "12.2 Termination for Convenience", "Either party may terminate this Agreement for any reason upon ninety (90) days' prior written notice to the other party."),
          citation("northstar-spa", "Northstar_SPA_Executed.pdf", 29, "12.4 Termination for Cause", "Either party may terminate immediately upon written notice if the other party materially breaches this Agreement and fails to cure such breach within thirty (30) days after receiving written notice."),
        ],
        change: [citation("northstar-spa", "Northstar_SPA_Executed.pdf", 12, "7.3 Change of Control", "Either party may assign this Agreement in connection with a merger, acquisition, corporate reorganization, or sale of all or substantially all of its assets.")],
        law: [citation("northstar-spa", "Northstar_SPA_Executed.pdf", 36, "15.1 Governing Law", "This Agreement is governed by the laws of the State of Delaware, without regard to conflict of law principles.")],
      },
    },
    {
      doc: "Meridian_Office_Lease.pdf", term: "7 years · expires Dec 31, 2031", termination: "Year 5 option; 12 months' notice + fee",
      change: "Landlord consent required", law: "California", risk: "High", riskReason: "Change-of-control consent and an early termination fee may affect transaction flexibility.",
      citations: {
        term: [citation("meridian-lease", "Meridian_Office_Lease.pdf", 9, "5.1 Lease Term", "The initial term is seven (7) years, commencing on January 1, 2025 and expiring on December 31, 2031.")],
        termination: [citation("meridian-lease", "Meridian_Office_Lease.pdf", 20, "11.2 Tenant Termination Option", "Tenant may terminate on the fifth anniversary by giving at least twelve (12) months' prior written notice and paying the termination fee described in Exhibit D.")],
        change: [citation("meridian-lease", "Meridian_Office_Lease.pdf", 14, "8.3 Assignment and Change of Control", "Tenant shall not assign this Lease or undergo a change of control without Landlord's prior written consent, not to be unreasonably withheld.")],
        law: [citation("meridian-lease", "Meridian_Office_Lease.pdf", 25, "14.1 Governing Law", "This Lease shall be governed by the laws of the State of California.")],
      },
    },
    {
      doc: "Atlas_Mutual_NDA.docx", term: "3 years · confidentiality survives 5 years", termination: "30 days' written notice",
      change: "Not specified in reviewed excerpts", law: "New York", risk: "Low", riskReason: "Mutual confidentiality obligations have a defined term and survival period.",
      citations: {
        term: [citation("atlas-nda", "Atlas_Mutual_NDA.docx", 4, "4.2 Term", "This Agreement remains in effect for three (3) years from the Effective Date. Confidentiality obligations survive for five (5) years following disclosure.")],
        termination: [citation("atlas-nda", "Atlas_Mutual_NDA.docx", 6, "6.1 Termination", "Either party may terminate this Agreement upon thirty (30) days' written notice.")],
        law: [citation("atlas-nda", "Atlas_Mutual_NDA.docx", 8, "9.1 Governing Law", "This Agreement is governed by the laws of the State of New York.")],
      },
    },
  ];
  const reviewRows = documents.map((document) => reviewExamples.find((row) => row.citations.term?.[0].documentId === document.id) || {
    doc: document.name,
    term: "Not extracted in demo review",
    termination: "Not extracted in demo review",
    change: "Not extracted in demo review",
    law: "Not extracted in demo review",
    risk: null,
    riskReason: undefined,
    citations: { term: undefined, termination: undefined, change: undefined, law: undefined },
  });

  function exportCsv() {
    const rows = [
      ["Agreement", "Term", "Termination", "Change of control", "Governing law", "Risk"],
      ...reviewRows.map((row) => [row.doc, row.term, row.termination, row.change, row.law, row.risk || "Not assessed"]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "lexroom-review.csv"; link.click();
    URL.revokeObjectURL(url);
  }

  const renderReviewCell = (value: string, citations?: Citation[]) => (
    <td className="px-3 py-4">
      {value}
      {citations?.map((source, index) => <button key={`${source.documentId}-${source.page}`} title={`${source.document} · ${source.section} · page ${source.page}`} onClick={() => { setSelectedCitation(source); setViewerOpen(true); }} className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded bg-violet-300/15 px-1 font-mono text-[8px] text-violet-100">{index + 1}</button>)}
    </td>
  );

  const sidebar = (
    <aside className="flex h-full w-[252px] shrink-0 flex-col border-r border-white/[.07] bg-[#08090f]">
      <div className="flex h-[60px] items-center justify-between border-b border-white/[.07] px-4">
        <a href="/" className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-cyan-300 font-display text-sm font-bold text-ink">L</span><span className="font-display text-sm font-semibold">lexroom<span className="text-violet-300">.</span></span></a>
        <IconButton label="Close sidebar" onClick={() => setMobileSidebar(false)} className="md:hidden"><X size={16} /></IconButton>
      </div>
      <div className="p-3"><button className="flex w-full items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.03] px-3 py-2.5 text-left text-xs text-white/70 hover:bg-white/[.06]"><FolderClosed size={14} className="text-violet-200" /><span className="flex-1">M&A — Northstar</span><ChevronDown size={13} className="text-white/35" /></button></div>
      <div className="px-3 pb-2 pt-3"><div className="flex items-center justify-between px-2 text-[9px] font-medium uppercase tracking-[.15em] text-white/35"><span>Data room</span><button aria-label="Add documents" onClick={() => fileInput.current?.click()} className="rounded p-1 hover:bg-white/10 hover:text-white"><Plus size={13} /></button></div>
        <label className="mt-3 flex items-center gap-2 rounded-lg border border-white/[.06] bg-white/[.025] px-2.5 py-2"><Search size={12} className="text-white/35" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a document" className="w-full bg-transparent text-[10px] text-white outline-none placeholder:text-white/30" /></label>
      </div>
      <div className="custom-scrollbar flex-1 overflow-y-auto px-2 py-1">
        {visibleDocs.map((doc) => <button key={doc.id} onClick={() => { const match = messages.flatMap((message) => message.citations || []).find((citation) => citation.documentId === doc.id); if (match) setSelectedCitation(match); setViewerOpen(true); }} className={`group flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-white/[.05] ${selectedCitation?.documentId===doc.id?"bg-white/[.06]":""}`}><FileText size={14} className="mt-0.5 shrink-0 text-white/40 group-hover:text-violet-200" /><span className="min-w-0 flex-1"><span className="block truncate text-[10px] text-white/70">{doc.name}</span><span className="mt-1 block text-[9px] text-white/35">{doc.pages} {doc.pages===1?"page":"pages"} · {doc.type}</span></span></button>)}
        {!visibleDocs.length && <div className="px-3 py-5 text-[10px] text-white/35">No matching documents.</div>}
      </div>
      <div className="border-t border-white/[.07] p-3">
        <button onClick={() => fileInput.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-3 text-[10px] text-white/55 transition hover:border-violet-200/40 hover:bg-violet-300/[.04] hover:text-white"><FilePlus2 size={14} /> Add documents</button>
        {uploadState && <div className="mt-3 flex items-center gap-2 text-[9px] text-cyan-100/70"><span className="h-1 w-1 animate-pulse rounded-full bg-cyan-200" />{uploadState}</div>}
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/[.035] p-2.5"><div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-300/10"><ShieldCheck size={14} className="text-violet-200" /></div><div><div className="text-[9px] text-white/65">Private workspace</div><div className="mt-0.5 text-[8px] text-white/35">{documents.length} documents · Demo mode</div></div></div>
      </div>
      <input ref={fileInput} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple className="hidden" onChange={(event) => event.target.files && uploadFiles(event.target.files)} />
    </aside>
  );

  return (
    <main
      className="flex h-[100dvh] flex-col overflow-hidden bg-[#07080d] text-white"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); void uploadFiles(event.dataTransfer.files); }}
    >
      <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-white/[.07] px-3 sm:px-5">
        <div className="flex items-center gap-2"><IconButton label="Open sidebar" onClick={() => setMobileSidebar(true)} className="md:hidden"><Menu size={17} /></IconButton><a href="/" className="flex items-center gap-1.5 text-[10px] text-white/35 hover:text-white"><ArrowLeft size={13} /> Site</a><ChevronRight size={13} className="text-white/20" /><div className="text-[11px] text-white/70">M&A — Northstar</div><span className="hidden rounded-full border border-cyan-200/15 bg-cyan-200/[.06] px-2 py-1 font-mono text-[8px] text-cyan-100/60 sm:inline-flex">DEMO ROOM</span></div>
        <div className="flex items-center gap-2"><div className="flex items-center gap-1 rounded-xl border border-white/[.08] bg-white/[.025] p-1"><button aria-label="Ask questions" onClick={()=>setMode("chat")} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[9px] sm:px-3 ${mode==="chat"?"bg-white/10 text-white":"text-white/40"}`}><MessageSquareText size={12} /><span className="hidden sm:inline">Ask</span></button><button aria-label="Review table" onClick={()=>setMode("table")} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[9px] sm:px-3 ${mode==="table"?"bg-white/10 text-white":"text-white/40"}`}><Table2 size={12} /><span className="hidden sm:inline">Review</span></button></div><button onClick={()=>setViewerOpen(!viewerOpen)} className="rounded-lg p-2 text-white/40 hover:bg-white/[.06] hover:text-white" aria-label="Toggle document viewer"><PanelRightClose size={15} /></button><div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-violet-300/30 to-cyan-200/20 text-[9px]">A</div></div>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className={`fixed inset-0 z-50 md:relative md:z-0 ${mobileSidebar?"block":"hidden md:block"}`}>{mobileSidebar&&<button aria-label="Close navigation" onClick={()=>setMobileSidebar(false)} className="absolute inset-0 bg-black/70 md:hidden" />}{sidebar}</div>
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-white/[.06] px-4 sm:px-6"><div><div className="text-[11px] text-white/75">{mode==="chat"?"Ask your data room":"Review table"}</div><div className="mt-0.5 text-[9px] text-white/35">{mode==="chat"?"Answers grounded in 3 source documents":"Cross-document clause comparison"}</div></div><div className="flex items-center gap-1 text-[9px] text-white/35"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> All sources indexed</div></div>
          <div className="flex min-h-0 flex-1">
            {mode==="chat" ? <div className="custom-scrollbar flex min-w-0 flex-1 flex-col overflow-y-auto">
              <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-4 py-6 sm:px-8 sm:py-9">
                {!messages.length ? <div className="my-auto py-5"><div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-200/20 bg-violet-300/[.08]"><Sparkles size={18} className="text-violet-200" /></div><div className="eyebrow">Good afternoon, Alex</div><h1 className="mt-3 font-display text-3xl tracking-[-.05em] sm:text-4xl">What do you need<br />to know?</h1><p className="mt-3 max-w-md text-xs leading-5 text-white/40">Ask a question across your data room. Each answer includes a direct path back to its source.</p><div className="mt-8 grid gap-2 sm:grid-cols-2">{starterQuestions.map((prompt,i)=><button onClick={()=>ask(prompt)} key={prompt} className={`rounded-xl border border-white/[.08] bg-white/[.025] p-3 text-left text-[10px] text-white/60 transition hover:border-violet-200/25 hover:bg-white/[.05] ${i===2?"sm:col-span-2":""}`}>{prompt}<ArrowUp size={12} className="float-right rotate-45 text-white/25" /></button>)}</div></div> : <div className="space-y-7">{messages.map((message)=><motion.div key={message.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className={message.role==="user"?"ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-white/[.075] px-4 py-3 text-xs leading-5 text-white/85":"max-w-full"}>{message.role==="assistant"&&<div className="mb-2 flex items-center gap-2 text-[9px] text-violet-200/75"><Sparkles size={12} /> Lexroom <span className="font-mono text-[8px] text-white/25">{message.mode==="ai"?"AI":"DEMO"}</span></div>}<div className="whitespace-pre-wrap text-xs leading-6 text-white/75">{message.text}</div>{message.citations&&<div className="mt-3 flex flex-wrap gap-2">{message.citations.map((citation,index)=><button key={`${citation.documentId}-${citation.page}-${index}`} onClick={()=>{setSelectedCitation(citation);setViewerOpen(true)}} className={`group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left transition ${selectedCitation===citation?"border-violet-300/30 bg-violet-300/10":"border-white/10 bg-white/[.03] hover:border-white/20"}`}><span className="flex h-4 w-4 items-center justify-center rounded bg-violet-300/15 font-mono text-[8px] text-violet-100">{index+1}</span><span className="max-w-[155px] truncate text-[9px] text-white/60">{citation.document.replaceAll("_"," ")}</span><span className="font-mono text-[8px] text-white/35">p.{citation.page}</span></button>)}</div>}</motion.div>)}{busy&&<div className="flex items-center gap-2 text-[10px] text-white/45"><span className="flex gap-1"><i className="h-1 w-1 animate-bounce rounded-full bg-violet-200 [animation-delay:-.2s]" /><i className="h-1 w-1 animate-bounce rounded-full bg-violet-200 [animation-delay:-.1s]" /><i className="h-1 w-1 animate-bounce rounded-full bg-violet-200" /></span>Searching source documents…</div>}</div>}
                <div ref={bottomRef} />
              </div>
              <div className="sticky bottom-0 mx-auto w-full max-w-[820px] bg-gradient-to-t from-[#07080d] via-[#07080d] to-transparent px-4 pb-4 pt-3 sm:px-8 sm:pb-6"><AnimatePresence>{error&&<motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mb-2 rounded-lg border border-rose-300/15 bg-rose-300/[.06] px-3 py-2 text-[10px] text-rose-100/75">{error}</motion.div>}</AnimatePresence><form onSubmit={(event)=>{event.preventDefault();ask()}} className="glass-surface rounded-2xl p-2"><textarea ref={inputRef} value={question} onChange={(event)=>setQuestion(event.target.value)} onKeyDown={(event)=>{if(event.key==="Enter"&&!event.shiftKey){event.preventDefault();ask()}}} placeholder="Ask a question about this data room…" rows={2} className="max-h-32 min-h-[50px] w-full resize-none bg-transparent px-3 py-2 text-xs leading-5 text-white outline-none placeholder:text-white/30" /><div className="flex items-center justify-between px-1 pb-1"><div className="flex items-center gap-2 text-[8px] text-white/30"><CircleHelp size={11} /> Verify every answer against source</div><button disabled={busy||!question.trim()} aria-label="Send question" className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-400 text-ink transition hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-30"><ArrowUp size={15} /></button></div></form><div className="mt-2 text-center text-[8px] text-white/25">AI-assisted; not legal advice. Verify against source.</div></div>
            </div> : <div className="custom-scrollbar flex min-w-0 flex-1 flex-col overflow-auto p-4 sm:p-7"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><div className="eyebrow">Cross-document review</div><h2 className="mt-2 font-display text-2xl tracking-tight">Key terms overview</h2><p className="mt-1 text-[10px] text-white/40">{documents.length} documents · Select a citation to inspect the source</p></div><button onClick={exportCsv} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-3 py-2 text-[10px] text-white/65 hover:bg-white/[.08]"><ArrowDownToLine size={13} /> Export CSV</button></div>
              <div className="custom-scrollbar overflow-auto rounded-xl border border-white/[.08]"><table className="w-full min-w-[700px] border-collapse text-left"><thead><tr className="bg-white/[.035] font-mono text-[8px] tracking-wide text-white/40">{["Agreement","Term","Termination","Change of control","Governing law","Risk"].map((heading)=><th key={heading} className="border-b border-white/[.08] px-3 py-3 font-normal">{heading}</th>)}</tr></thead><tbody>{reviewRows.map((row,i)=><motion.tr key={row.doc} initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} transition={{delay:i*.1}} className="border-b border-white/[.055] text-[9px] text-white/65 last:border-0"><td className="px-3 py-4 font-medium text-white/80">{row.doc}</td>{renderReviewCell(row.term,row.citations.term)}{renderReviewCell(row.termination,row.citations.termination)}{renderReviewCell(row.change,row.citations.change)}{renderReviewCell(row.law,row.citations.law)}<td className="px-3 py-4"><RiskBadge risk={row.risk} reason={row.riskReason} /></td></motion.tr>)}</tbody></table></div><div className="mt-3 flex items-center gap-2 text-[9px] text-white/35"><Check size={12} className="text-cyan-200/70" /> Sample cells include supporting page-and-clause citations; uploads are not yet assessed.</div><div className="mt-auto pt-8 text-center text-[8px] text-white/25">AI-assisted; not legal advice. Verify against source.</div></div>}
            {!viewerOpen&&<button onClick={()=>setViewerOpen(true)} className="hidden border-l border-white/[.07] px-3 text-white/40 hover:text-white xl:flex" aria-label="Open document viewer"><ChevronRight size={16} /></button>}
            {viewerOpen&&<button aria-label="Close document preview" onClick={()=>setViewerOpen(false)} className="fixed inset-0 top-[60px] z-30 bg-black/50 xl:hidden" />}
            <aside className={`fixed inset-y-[60px] right-0 z-40 flex w-[min(90vw,360px)] shrink-0 flex-col border-l border-white/[.07] bg-[#090a10] transition-transform xl:static xl:inset-auto xl:z-0 xl:w-[330px] xl:translate-x-0 ${viewerOpen?"translate-x-0 xl:flex":"translate-x-full xl:hidden"}`}><div className="flex h-[52px] items-center justify-between border-b border-white/[.06] px-4"><div className="flex items-center gap-2 text-[10px] text-white/65"><FileText size={13} className="text-violet-200" /><span className="max-w-[220px] truncate">{selectedCitation?.document||currentDoc?.name||"Document viewer"}</span></div><IconButton label="Close document viewer" onClick={()=>setViewerOpen(false)}><X size={14} /></IconButton></div><div className="custom-scrollbar flex-1 overflow-y-auto p-4"><div className="mb-3 flex items-center justify-between font-mono text-[8px] text-white/35"><span>{selectedCitation?.section||"SOURCE PREVIEW"}</span><span>PAGE {selectedCitation?.page||"—"}</span></div><div className="min-h-[480px] rounded-lg border border-white/[.06] bg-[#0f1119] px-5 py-8 shadow-inner"><div className="mx-auto max-w-[220px]"><div className="mb-8 text-center font-display text-[11px] text-white/60">{currentDoc?.name.replaceAll("_"," ").replace(".pdf","").replace(".docx","")}</div><div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="doc-line" style={{width:`${80+(i*13)%20}%`}} />)}</div><div className="my-7 rounded bg-violet-300/[.12] px-2 py-2 text-[9px] leading-5 text-violet-50/90 ring-1 ring-violet-200/20">{currentText}</div><div className="space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="doc-line" style={{width:`${68+(i*17)%30}%`,opacity:.5}} />)}</div></div></div><div className="mt-3 rounded-lg border border-white/[.06] bg-white/[.025] p-3"><div className="font-mono text-[8px] text-cyan-100/65">SOURCE VERIFIED · {selectedCitation?.document||currentDoc?.name}</div><div className="mt-1 text-[9px] text-white/35">{selectedCitation?.section||"Select a citation from an answer"}{selectedCitation?` · Page ${selectedCitation.page}`:""}</div></div></div></aside>
          </div>
          <div className="flex h-7 shrink-0 items-center justify-between border-t border-white/[.06] px-4 text-[8px] text-white/25 sm:px-5"><span>Lexroom · Demo environment</span><span className="flex items-center gap-1.5"><ShieldCheck size={10} /> AI-assisted; not legal advice. Verify against source.</span></div>
        </section>
      </div>
    </main>
  );
}
