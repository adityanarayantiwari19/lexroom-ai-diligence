"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, FileText, LockKeyhole, Menu, Quote, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GlassButton } from "./glass-button";
import { LenisProvider } from "./lenis-provider";

const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false, loading: () => <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_68%_40%,rgba(108,92,231,.17),transparent_52%)]" /> });

const scenes = [
  { n: "01", label: "Gather", title: "A thousand files.\nOne clear picture.", detail: "Bring contracts, leases, NDAs and financial records into one private, searchable room.", icon: "01 / INGESTION", color: "from-violet-400/20 to-cyan-300/5" },
  { n: "02", label: "Understand", title: "Every clause,\nread in context.", detail: "Lexroom traces obligations, exceptions and defined terms across the documents that matter.", icon: "02 / ANALYSIS", color: "from-cyan-300/15 to-indigo-400/5" },
  { n: "03", label: "Ask", title: "Questions in.\nEvidence out.", detail: "Ask naturally. Get an answer linked to the exact page and language it came from.", icon: "03 / ANSWERS", color: "from-indigo-400/20 to-fuchsia-300/5" },
  { n: "04", label: "Compare", title: "See the whole\nportfolio at once.", detail: "Build a cross-document review table with consistent fields and source-backed entries.", icon: "04 / REVIEW", color: "from-violet-300/15 to-sky-300/5" },
  { n: "05", label: "Protect", title: "Your room stays\nyour room.", detail: "Private workspaces, careful access controls and source-level verification are built into the workflow.", icon: "05 / CONTROL", color: "from-cyan-300/15 to-violet-400/10" },
];
const faqs = [
  ["How does Lexroom cite its answers?", "Each answer is linked to the source document, page and clause that supports it. Select a citation to open the excerpt in context. If the documents do not contain the answer, Lexroom says so."],
  ["What file types can I use?", "The demo accepts PDF and DOCX uploads, and includes three sample documents to explore immediately. Production deployments can add additional formats through the ingestion pipeline."],
  ["Is this legal advice?", "No. Lexroom is an AI-assisted research tool. It helps teams locate and organize information; a qualified professional should verify every finding against the source."],
  ["Can my team use its own AI provider?", "The API route supports Anthropic through an environment variable. Without a key, the app defaults to a deterministic demo mode and requires no account or external service."],
];

function Stat({ value, label }: { value: string; label: string }) {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); observer.disconnect(); }
    }, { threshold: .35 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className="border-l border-white/10 pl-5"><div className="font-display text-4xl tracking-tight text-white">{shown ? value : "—"}</div><div className="mt-2 text-xs text-white/45">{label}</div></div>;
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  return <motion.div className={className} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: reduced ? 0 : .65, ease: [.22, 1, .36, 1] }}>{children}</motion.div>;
}

export function MarketingPage() {
  const [mobileNav, setMobileNav] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [testimonial, setTestimonial] = useState(0);
  const testimonials = [
    { quote: "I used to spend the first two days of a diligence sprint just finding the right clauses. Now I can start with the actual decisions.", name: "M&A Counsel", role: "Growth equity firm" },
    { quote: "The citations change the conversation. We can move quickly without giving up the ability to check every answer ourselves.", name: "Commercial Partner", role: "Full-service law firm" },
    { quote: "A clean comparison across the whole room, with the original wording one click away. That's how review should feel.", name: "Legal Operations Lead", role: "Technology company" },
  ];

  return (
    <>
      <LenisProvider />
      <main className="overflow-hidden bg-ink">
        <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-7">
          <nav className="glass-surface mx-auto flex max-w-[1320px] items-center justify-between rounded-2xl px-4 py-3 sm:px-6">
            <a href="#" className="flex items-center gap-2.5" aria-label="Lexroom home">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-cyan-300 text-ink"><span className="font-display text-lg font-bold">L</span></span>
              <span className="font-display text-[17px] font-semibold tracking-[-.04em]">lexroom<span className="text-violet-300">.</span></span>
            </a>
            <div className="hidden items-center gap-8 text-[13px] text-white/55 md:flex">
              <a className="transition hover:text-white" href="#platform">Platform</a><a className="transition hover:text-white" href="#workflow">How it works</a><a className="transition hover:text-white" href="#security">Security</a><a className="transition hover:text-white" href="#faq">FAQ</a>
            </div>
            <div className="hidden items-center gap-3 md:flex"><a href="#workflow" className="px-3 py-2 text-xs text-white/60 hover:text-white">Explore</a><GlassButton variant="primary" href="/app" className="px-4 py-2.5 text-xs">Open the demo <ArrowUpRight size={14} /></GlassButton></div>
            <button onClick={() => setMobileNav(!mobileNav)} className="rounded-lg p-2 text-white md:hidden" aria-label="Toggle navigation">{mobileNav ? <X size={19} /> : <Menu size={19} />}</button>
          </nav>
          {mobileNav && <div className="glass-surface mx-1 mt-2 grid gap-1 rounded-2xl p-3 md:hidden">{["Platform", "How it works", "Security", "FAQ"].map((item) => <a key={item} href={`#${item === "How it works" ? "workflow" : item.toLowerCase()}`} onClick={() => setMobileNav(false)} className="rounded-lg px-3 py-3 text-sm text-white/75">{item}</a>)}<a href="/app" className="rounded-lg bg-violet-500 px-3 py-3 text-sm text-white">Open the demo →</a></div>}
        </header>

        <section className="noise mesh-glow relative flex min-h-[760px] h-[100svh] max-h-[1100px] items-center border-b border-white/[.06]">
          <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:80px_80px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
          <div className="absolute inset-0 z-0 hidden md:block"><HeroScene /></div>
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-ink via-ink/85 to-transparent md:via-ink/65" />
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .85, delay: .12 }} className="relative z-10 mx-auto w-full max-w-[1320px] px-6 pb-12 pt-28 sm:px-10 lg:px-16">
            <div className="max-w-[660px]">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5 text-[10px] tracking-wide text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_9px_#22d3ee]" /> A NEW STANDARD FOR LEGAL DILIGENCE</div>
              <h1 className="font-display text-[clamp(3.55rem,8vw,7.2rem)] font-medium leading-[.94] tracking-[-.075em]">Find the answer<br />in <span className="text-gradient">every document.</span></h1>
              <p className="mt-7 max-w-[470px] text-base leading-7 text-white/55 sm:text-lg sm:leading-8">A sharper way to diligence. Ask your data room anything, then follow every answer back to the exact clause.</p>
              <div className="mt-9 flex flex-wrap items-center gap-3"><GlassButton variant="primary" href="/app">Explore the workspace <ArrowRight size={16} /></GlassButton><GlassButton href="#workflow">See how it works <ArrowDown size={15} /></GlassButton></div>
              <div className="mt-12 flex items-center gap-3 text-[11px] text-white/40"><div className="flex -space-x-2">{["#8b7bff", "#4aa9c7", "#de9c75", "#6dbda9"].map((color, i) => <span key={color} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink text-[9px] text-white" style={{ background: color }}>{["A", "J", "M", "S"][i]}</span>)}</div><span>Built for teams that need to know, not just search.</span></div>
            </div>
          </motion.div>
          <div className="absolute bottom-8 right-8 z-10 hidden items-center gap-3 text-[9px] uppercase tracking-[.22em] text-white/35 sm:flex"><span>Scroll to explore</span><span className="h-px w-9 bg-white/25" /></div>
          <div className="absolute bottom-0 left-1/2 z-10 h-24 w-px bg-gradient-to-b from-white/20 to-transparent" />
        </section>

        <section className="relative border-b border-white/[.06] px-6 py-24 sm:px-10 lg:px-16">
          <div className="mx-auto grid max-w-[1160px] gap-14 md:grid-cols-[.8fr_1.2fr] md:items-end">
            <Reveal><div className="eyebrow">The signal is in the detail</div><h2 className="mt-5 font-display text-4xl leading-[1.08] tracking-[-.055em] sm:text-5xl">Less hunting.<br /><span className="text-white/40">More knowing.</span></h2></Reveal>
            <Reveal className="grid grid-cols-3 gap-6"><Stat value="1,000s" label="of documents, one room" /><Stat value="Every" label="answer source-linked" /><Stat value="Minutes" label="to your first insight" /></Reveal>
          </div>
        </section>

        <section id="workflow" className="relative px-6 py-28 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-[1160px]">
            <Reveal className="mb-14 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="eyebrow">A room that works harder</div><h2 className="mt-5 max-w-xl font-display text-4xl leading-[1.08] tracking-[-.055em] sm:text-6xl">From raw files<br />to <span className="text-gradient">real clarity.</span></h2></div><p className="max-w-sm text-sm leading-6 text-white/45">Five deliberate steps turn a crowded data room into decisions you can stand behind.</p></Reveal>
            <div className="space-y-5">
              {scenes.map((scene, index) => (
                <Reveal key={scene.n}>
                  <article className={`story-pin relative grid overflow-hidden rounded-[26px] border border-white/[.08] bg-gradient-to-br ${scene.color} md:grid-cols-[.85fr_1.15fr]`}>
                    <div className="relative z-10 flex flex-col justify-between p-7 sm:p-10 lg:p-12">
                      <div><div className="eyebrow">{scene.icon}</div><h3 className="mt-7 whitespace-pre-line font-display text-3xl leading-[1.08] tracking-[-.05em] sm:text-5xl">{scene.title}</h3><p className="mt-5 max-w-sm text-sm leading-6 text-white/50">{scene.detail}</p></div>
                      <span className="mt-12 font-mono text-xs text-white/35">{scene.n} <span className="mx-2 text-white/15">/</span> {scene.label}</span>
                    </div>
                    <div className="relative flex min-h-[290px] items-center justify-center overflow-hidden md:min-h-[400px]">
                      <div className="absolute h-64 w-64 rounded-full bg-violet-400/10 blur-[80px]" />
                      {index === 0 && <div className="relative grid w-[78%] grid-cols-3 gap-3">{["NDA", "Lease", "SPA", "Cap table", "Employment", "More files"].map((name, i) => <motion.div key={name} initial={{ opacity: 0, y: 35, rotate: (i % 2 ? 3 : -3) }} whileInView={{ opacity: 1, y: 0, rotate: 0 }} viewport={{ once: true }} transition={{ delay: i * .08 }} className="glass-surface rounded-xl p-3 sm:p-4"><FileText size={17} className="mb-5 text-violet-200" /><div className="text-[10px] text-white/70">{name}</div><div className="mt-2 h-1 w-3/4 rounded bg-white/10" /></motion.div>)}</div>}
                      {index === 1 && <div className="glass-surface relative w-[75%] rotate-[-3deg] rounded-xl p-6 sm:p-8"><div className="mb-6 flex items-center gap-2"><FileText size={15} className="text-cyan-200" /><span className="font-mono text-[9px] text-white/45">NORTHSTAR_SPA.PDF / PAGE 12</span></div>{[.92,.74,.85,.82,.6,.87,.7].map((w,i)=><div key={i} className={`mb-3 h-1.5 rounded-full ${i===3?"bg-violet-300/80 shadow-[0_0_16px_rgba(167,139,250,.5)]":"bg-white/15"}`} style={{width:`${w*100}%`}} />)}<span className="absolute -right-4 top-[48%] rounded-full border border-violet-300/30 bg-violet-400/15 px-3 py-1.5 font-mono text-[9px] text-violet-100">change of control</span></div>}
                      {index === 2 && <div className="glass-surface relative w-[82%] rounded-2xl p-5 sm:p-7"><div className="flex items-center gap-2 text-[10px] text-white/45"><Sparkles size={13} className="text-violet-300" /> ASK THE ROOM</div><div className="mt-5 rounded-xl border border-white/[.08] bg-black/20 p-3 text-xs text-white/75">Which contracts have change-of-control clauses?</div><div className="my-4 h-px bg-white/[.07]" /><p className="text-xs leading-5 text-white/65">Two agreements include change-of-control terms. The lease requires consent; the SPA permits assignment with notice.<sup className="ml-1 rounded bg-violet-400/20 px-1 text-[9px] text-violet-200">1</sup></p><div className="mt-4 flex gap-2"><span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[8px] text-white/45">SPA · P.12</span><span className="rounded-md border border-white/10 px-2 py-1 font-mono text-[8px] text-white/45">LEASE · P.14</span></div></div>}
                      {index === 3 && <div className="glass-surface w-[86%] overflow-hidden rounded-xl"><div className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-white/10 bg-white/[.035] p-3 font-mono text-[8px] text-white/45"><span>AGREEMENT</span><span>TERM</span><span>CHANGE OF CONTROL</span></div>{[["Northstar SPA","—","Notice · §7.3"],["Meridian Lease","7 years","Consent · §8.3"],["Atlas NDA","3 years","Not specified"]].map((row,i)=><motion.div key={row[0]} initial={{ opacity: 0, x: 15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i*.15 }} className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-white/[.06] p-3 text-[9px] text-white/65"><span>{row[0]}</span><span>{row[1]}</span><span className="text-cyan-200/80">{row[2]}</span></motion.div>)}</div>}
                      {index === 4 && <div className="relative flex h-60 w-60 items-center justify-center"><div className="absolute inset-0 rounded-full border border-cyan-200/20 shadow-[0_0_60px_rgba(34,211,238,.12)]" /><div className="absolute inset-5 rounded-full border border-violet-200/20" /><div className="absolute inset-10 rounded-full border border-white/10" /><div className="glass-surface flex h-24 w-24 items-center justify-center rounded-[28px]"><ShieldCheck size={42} strokeWidth={1.1} className="text-cyan-200" /></div><span className="absolute -bottom-3 rounded-full border border-cyan-200/20 bg-ink/70 px-3 py-1.5 font-mono text-[8px] text-cyan-100/70">PRIVATE BY DESIGN</span></div>}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className="relative border-y border-white/[.06] bg-[#080910] px-6 py-24 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-[1160px]">
            <Reveal><div className="eyebrow">One workspace. A complete picture.</div><div className="mt-5 flex flex-col justify-between gap-6 md:flex-row md:items-end"><h2 className="max-w-2xl font-display text-4xl leading-[1.08] tracking-[-.055em] sm:text-6xl">Built for the questions<br />that move a deal.</h2><p className="max-w-sm text-sm leading-6 text-white/45">A connected toolkit that keeps the source material close, from the first upload through the final review.</p></div></Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Ask across the room", "Follow a natural-language question wherever the evidence leads.", "01"],
                ["Citations you can check", "Open the exact page and clause behind every answer.", "02"],
                ["Compare at a glance", "Turn scattered provisions into a consistent review table.", "03"],
                ["Know what is missing", "See when a room does not contain enough evidence to answer.", "04"],
              ].map(([title, detail, no], i) => <Reveal key={title}><article className="glass-surface group h-full rounded-2xl p-6 transition hover:-translate-y-1 hover:border-white/20"><div className="mb-12 flex items-center justify-between"><span className="font-mono text-[10px] text-violet-200/70">{no} / WORKFLOW</span><ArrowUpRight size={15} className="text-white/25 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white" /></div><h3 className="font-display text-lg tracking-tight">{title}</h3><p className="mt-3 text-xs leading-5 text-white/45">{detail}</p></article></Reveal>)}
            </div>
          </div>
        </section>

        <section className="overflow-hidden border-b border-white/[.06] py-6">
          <div className="flex min-w-max animate-[marquee_28s_linear_infinite] gap-8 px-5 text-[10px] uppercase tracking-[.2em] text-white/35 sm:gap-14 sm:text-xs">
            {Array.from({length:2}).flatMap((_,i)=>["M&A diligence","Real estate","Funding rounds","Employment","Commercial contracts","Compliance"].map((item,j)=><span key={`${i}-${item}`} className="flex items-center gap-8 sm:gap-14">{item}<span className="text-violet-300/65">✳</span></span>))}
          </div>
        </section>

        <section id="security" className="mesh-glow relative px-6 py-24 sm:px-10 lg:px-16">
          <div className="mx-auto grid max-w-[1160px] gap-12 md:grid-cols-[1fr_.8fr] md:items-center">
            <Reveal><div className="eyebrow">Careful with what matters</div><h2 className="mt-5 font-display text-4xl leading-[1.08] tracking-[-.055em] sm:text-6xl">Built around<br /><span className="text-gradient">your room.</span></h2><p className="mt-6 max-w-lg text-sm leading-7 text-white/50">Legal diligence depends on trust. Lexroom keeps the experience focused on controlled access, traceable sources and clear boundaries around AI-generated output.</p><div className="mt-8 space-y-4">{["Source-linked answers, never mystery summaries","Demo works without sending documents to an AI provider","AI-assisted; not legal advice. Verify against source."].map((line)=><div key={line} className="flex items-start gap-3 text-xs text-white/65"><Check size={15} className="mt-0.5 shrink-0 text-cyan-200" />{line}</div>)}</div></Reveal>
            <Reveal><div className="glass-surface relative mx-auto flex aspect-square w-full max-w-[400px] items-center justify-center overflow-hidden rounded-[32px]"><div className="absolute h-52 w-52 rounded-full bg-violet-500/20 blur-[70px]" /><div className="absolute inset-10 rounded-full border border-white/[.07]" /><div className="absolute inset-20 rounded-full border border-cyan-200/[.13]" /><div className="relative flex h-32 w-32 items-center justify-center rounded-[36px] border border-white/20 bg-white/[.06] shadow-[0_0_70px_rgba(108,92,231,.2)]"><LockKeyhole size={46} strokeWidth={1.15} className="text-violet-100" /></div><div className="absolute bottom-8 flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 font-mono text-[9px] tracking-wider text-white/50"><span className="h-1.5 w-1.5 rounded-full bg-cyan-200" /> ACCESS CONTROLLED</div></div></Reveal>
          </div>
        </section>

        <section className="border-y border-white/[.06] bg-[#080910] px-6 py-24 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-[940px]">
            <Reveal className="text-center"><div className="eyebrow">From the review room</div><div className="mx-auto mt-8 flex max-w-3xl flex-col items-center"><Quote size={22} className="text-violet-300/80" /><p className="mt-6 min-h-[118px] font-display text-2xl leading-[1.35] tracking-[-.035em] text-white/85 sm:text-4xl">“{testimonials[testimonial].quote}”</p><div className="mt-7 text-xs font-medium text-white/75">{testimonials[testimonial].name}</div><div className="mt-1 text-[10px] text-white/40">{testimonials[testimonial].role}</div><div className="mt-7 flex gap-2">{testimonials.map((item,i)=><button key={item.name} aria-label={`Show testimonial ${i+1}`} onClick={()=>setTestimonial(i)} className={`h-1.5 rounded-full transition-all ${testimonial===i?"w-7 bg-violet-300":"w-1.5 bg-white/25"}`} />)}</div></div></Reveal>
          </div>
        </section>

        <section id="faq" className="px-6 py-24 sm:px-10 lg:px-16">
          <div className="mx-auto grid max-w-[1160px] gap-12 md:grid-cols-[.7fr_1.3fr]">
            <Reveal><div className="eyebrow">Good questions</div><h2 className="mt-5 font-display text-4xl tracking-[-.055em] sm:text-5xl">Before you<br />open a room.</h2><p className="mt-5 max-w-xs text-sm leading-6 text-white/45">A few things worth knowing before you start.</p></Reveal>
            <div>{faqs.map(([question, answer],i)=><Reveal key={question}><div className="border-b border-white/10"><button className="flex w-full items-center justify-between py-6 text-left text-sm text-white/80" onClick={()=>setFaqOpen(faqOpen===i?null:i)} aria-expanded={faqOpen===i}>{question}<ChevronDown size={16} className={`ml-4 shrink-0 text-white/45 transition ${faqOpen===i?"rotate-180":""}`} /></button>{faqOpen===i&&<p className="max-w-2xl pb-6 pr-8 text-xs leading-6 text-white/45">{answer}</p>}</div></Reveal>)}</div>
          </div>
        </section>

        <section className="px-6 pb-20 sm:px-10 lg:px-16">
          <div className="noise mesh-glow relative mx-auto max-w-[1160px] overflow-hidden rounded-[30px] border border-white/10 bg-[#0c0d16] px-7 py-16 text-center sm:px-14 sm:py-24">
            <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/15 blur-[90px]" />
            <div className="relative"><div className="eyebrow">Open the room</div><h2 className="mx-auto mt-5 max-w-2xl font-display text-4xl leading-[1.05] tracking-[-.06em] sm:text-6xl">The answer was<br />in there all along.</h2><p className="mx-auto mt-5 max-w-md text-sm leading-6 text-white/45">See what changes when your documents can finally answer back.</p><div className="mt-8 flex justify-center"><GlassButton variant="primary" href="/app">Try the interactive demo <ArrowRight size={16} /></GlassButton></div></div>
          </div>
        </section>
        <footer className="border-t border-white/[.07] px-6 py-7 sm:px-10 lg:px-16"><div className="mx-auto flex max-w-[1160px] flex-col justify-between gap-4 text-[10px] text-white/35 sm:flex-row sm:items-center"><div className="flex items-center gap-2"><span className="font-display text-sm text-white/70">lexroom.</span><span>© 2025 Lexroom</span></div><div className="flex items-center gap-4"><span>AI-assisted; not legal advice. Verify against source.</span><a className="hover:text-white" href="/app">Open demo <ArrowUpRight size={10} className="inline" /></a></div></div></footer>
      </main>
      <style jsx global>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </>
  );
}
