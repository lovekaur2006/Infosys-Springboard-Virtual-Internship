import { useEffect, useRef, useState } from "react"
import type { CSSProperties, MouseEvent } from "react"
import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bot,
  Briefcase,
  CalendarCheck,
  Flame,
  Handshake,
  Radio,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react"
import SculptureHero from "./ui/liquid-sculpture-hero"

const BG = "#111110"
const vars = (o: Record<string, string | number>) => o as CSSProperties

/* ───────────── data ───────────── */

const FEATURES = [
  { icon: Bot, c: "#8E96FF", title: "Multi-agent orchestration", text: "An Orchestrator Agent manages turn order, tracks negotiation state and resolves deadlocks between autonomous AI stakeholders." },
  { icon: Zap, c: "#F5B84B", title: "Personality engine", text: "Give every agent a style: aggressive, collaborative or risk-averse. Same scenario, completely different negotiation." },
  { icon: Radio, c: "#5DD6B0", title: "Live Negotiation Arena", text: "Chat-style transcript with per-turn reasoning, live stance indicators and round metrics while the deal unfolds." },
  { icon: Users, c: "#6CB6FF", title: "Simulation and Practice modes", text: "Watch AI agents negotiate each other, or take a seat at the table and negotiate against them yourself." },
  { icon: BarChart3, c: "#FF8F7A", title: "Outcome reports", text: "Final terms, concession timeline, rounds elapsed and a per-agent objective score, ready to download." },
  { icon: CalendarCheck, c: "#C792FF", title: "Google Calendar sync", text: "Agreed sessions go straight to Google Calendar, so a finished negotiation turns into a scheduled meeting." },
]

const STEPS = [
  { n: "01", title: "Select a scenario", text: "Pick a pre-built template with agents, goals and constraints already defined." },
  { n: "02", title: "Configure agents", text: "Review roles and goals, then set each agent's negotiation personality." },
  { n: "03", title: "Negotiate", text: "Run AI vs AI, or join as one of the parties and trade offers in real time." },
  { n: "04", title: "Review and schedule", text: "Study the outcome report, then sync the agreed session to your calendar." },
]

const SCENARIOS = [
  { icon: Handshake, color: "#3B82F6", title: "Vendor Pricing", agents: "Buyer + Vendor", text: "Price per seat, contract length, payment terms and SLA." },
  { icon: Briefcase, color: "#8B5CF6", title: "Job Offer", agents: "Candidate + Recruiter + Hiring Manager", text: "Salary, joining bonus, remote days and start date." },
  { icon: Users, color: "#10B981", title: "Budget Allocation", agents: "Engineering + Marketing + Finance", text: "Split a limited budget while protecting a reserve." },
]

const PERSONALITIES = [
  { icon: Flame, c: "#FF7A5E", name: "Aggressive", text: "Extreme anchors, slow concessions, hard deadlines.", traits: [["Assertiveness", 92], ["Flexibility", 18], ["Risk appetite", 86]] },
  { icon: Users, c: "#4CC38A", name: "Collaborative", text: "Win-win trades, shared priorities, steady give and take.", traits: [["Assertiveness", 54], ["Flexibility", 78], ["Risk appetite", 50]] },
  { icon: ShieldCheck, c: "#7FA6FF", name: "Risk-Averse", text: "Wants guarantees, closes early, avoids open commitments.", traits: [["Assertiveness", 34], ["Flexibility", 62], ["Risk appetite", 14]] },
] as const

const STACK = ["React 19", "TypeScript", "Vite", "Google Identity Services", "Google Calendar API", "Multi-agent engine"]
const TICKER = ["Vendor pricing", "Job offers", "Budget allocation", "Aggressive", "Collaborative", "Risk-averse", "Simulation mode", "Practice mode", "Deadlock detection", "Outcome reports", "Calendar sync"]

const STATS: { to: number; l: string }[] = [
  { to: 3, l: "Ready scenarios" },
  { to: 3, l: "Agent personalities" },
  { to: 2, l: "Modes: Simulate or Practice" },
  { to: 8, l: "Core modules" },
]

type Msg = { who: "buyer" | "vendor"; offer: number; text: string }
const MSGS: Msg[] = [
  { who: "buyer", offer: 70, text: "Opening at $70 per seat for 500 licences, 12 months." },
  { who: "vendor", offer: 130, text: "List price is $135. I can do $130 on a 24-month term." },
  { who: "buyer", offer: 82, text: "Two years is too long. $82 with a 99.9% uptime SLA." },
  { who: "vendor", offer: 115, text: "SLA is fine. $115 if you pay net-45." },
  { who: "buyer", offer: 92, text: "Net-45 works. Can we meet at $92?" },
  { who: "vendor", offer: 100, text: "Closer. $100 and I include priority support." },
  { who: "buyer", offer: 98, text: "$98 with priority support and we have a deal." },
  { who: "vendor", offer: 98, text: "Agreed. $98 per seat, net-45, 99.9% SLA." },
]

/* ───────────── styles ───────────── */

const CSS = `
html{scroll-behavior:smooth}
.nl{position:relative;background:${BG};color:#F1EFEA;font-family:'Geist','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased}
.nl *{box-sizing:border-box}
.nl-progress{position:fixed;inset:0 0 auto 0;height:3px;z-index:60;pointer-events:none}
.nl-progress div{height:100%;transform-origin:0 50%;transform:scaleX(0);background:linear-gradient(90deg,#8E96FF,#5DD6B0,#F5B84B)}
.nl-wrap{position:relative;z-index:1;max-width:1160px;margin:0 auto;padding:0 clamp(20px,4vw,48px)}
.nl-sec{position:relative;overflow:hidden;padding:clamp(72px,10vw,128px) 0;scroll-margin-top:20px}
.nl-orb{position:absolute;width:560px;height:560px;border-radius:50%;background:radial-gradient(circle,var(--c) 0%,transparent 68%);opacity:.14;filter:blur(30px);pointer-events:none;animation:nl-float 14s ease-in-out infinite}
@keyframes nl-float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-30px) scale(1.12)}}
.nl-eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.55;margin:0 0 16px;display:flex;gap:12px;align-items:center}
.nl-eyebrow::before{content:"";width:28px;height:1px;background:currentColor}
.nl h2{font-size:clamp(30px,4.6vw,56px);line-height:1;letter-spacing:-.04em;font-weight:500;margin:0 0 18px;max-width:18ch;text-wrap:balance}
.nl h2 em{font-family:'Instrument Serif','Times New Roman',serif;font-weight:400;letter-spacing:-.02em;background:linear-gradient(90deg,#B9BEFF,#7DE3C2,#FFD08A,#B9BEFF);background-size:240% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:nl-shine 7s linear infinite}
@keyframes nl-shine{to{background-position:240% center}}
.nl-lead{max-width:56ch;opacity:.7;font-size:17px;line-height:1.55;margin:0 0 48px}

/* reveal */
.nl-rv{opacity:0;transform:translateY(28px);transition:opacity .8s ease var(--d,0ms),transform .8s cubic-bezier(.2,.7,.2,1) var(--d,0ms)}
.nl-rv.in{opacity:1;transform:none}

/* ticker */
.nl-ticker{border-block:1px solid rgba(241,239,234,.12);overflow:hidden;padding:18px 0;mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)}
.nl-track{display:flex;width:max-content;animation:nl-marq 38s linear infinite}
.nl-ticker:hover .nl-track{animation-play-state:paused}
.nl-track span{font-size:clamp(20px,2.6vw,30px);letter-spacing:-.03em;padding:0 22px;white-space:nowrap;opacity:.8}
.nl-track span:nth-child(even){font-family:'Instrument Serif',serif;font-style:italic;opacity:.55}
.nl-track i{font-style:normal;color:#8E96FF;align-self:center}
@keyframes nl-marq{to{transform:translateX(-50%)}}

/* stats */
.nl-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));border-top:1px solid rgba(241,239,234,.14);border-bottom:1px solid rgba(241,239,234,.14)}
.nl-stat{padding:32px 24px;border-left:1px solid rgba(241,239,234,.14)}
.nl-stat:first-child{border-left:0}
.nl-stat b{display:block;font-size:clamp(48px,6.5vw,80px);line-height:1;letter-spacing:-.05em;font-weight:500;font-variant-numeric:tabular-nums}
.nl-stat span{display:block;margin-top:10px;font-size:13.5px;opacity:.6}

/* cards */
.nl-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.nl-card{position:relative;overflow:hidden;padding:28px;border-radius:20px;background:rgba(241,239,234,.04);border:1px solid rgba(241,239,234,.1);
  transition:opacity .8s ease var(--d,0ms),transform .8s cubic-bezier(.2,.7,.2,1) var(--d,0ms),border-color .25s,background .25s}
.nl-card.in:hover{transform:translateY(-5px);transition-delay:0ms,0ms,0ms,0ms;border-color:color-mix(in srgb,var(--c,#8E96FF) 55%,transparent);background:rgba(241,239,234,.07)}
.nl-card::before{content:"";position:absolute;inset:0;background:radial-gradient(260px circle at var(--mx,50%) var(--my,0%),color-mix(in srgb,var(--c,#8E96FF) 26%,transparent),transparent 70%);opacity:0;transition:opacity .3s;pointer-events:none}
.nl-card:hover::before{opacity:1}
.nl-card>*{position:relative}
.nl-ic{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;margin-bottom:22px;background:color-mix(in srgb,var(--c,#8E96FF) 20%,transparent);color:var(--c,#8E96FF);transition:transform .4s cubic-bezier(.3,1.5,.5,1)}
.nl-card:hover .nl-ic{transform:rotate(-8deg) scale(1.12)}
.nl-card h3{margin:0 0 8px;font-size:20px;letter-spacing:-.02em;font-weight:500}
.nl-card p{margin:0;font-size:14.5px;line-height:1.55;opacity:.68}
.nl-agents{font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.5;margin:-2px 0 12px}

/* steps with connecting line */
.nl-steps{position:relative;display:grid;gap:0;grid-template-columns:repeat(auto-fit,minmax(230px,1fr))}
.nl-steps::before{content:"";position:absolute;left:0;right:0;top:0;height:1px;background:rgba(241,239,234,.2)}
.nl-steps::after{content:"";position:absolute;left:0;top:0;height:1px;width:100%;background:linear-gradient(90deg,#8E96FF,#5DD6B0);transform:scaleX(0);transform-origin:0 50%;transition:transform 1.8s cubic-bezier(.2,.7,.2,1)}
.nl-steps.in::after{transform:scaleX(1)}
.nl-step{position:relative;padding:34px 24px 28px 0}
.nl-step::before{content:"";position:absolute;top:-5px;left:0;width:11px;height:11px;border-radius:50%;background:${BG};border:2px solid #8E96FF;box-shadow:0 0 0 0 rgba(142,150,255,.5);animation:nl-ping 2.8s ease-out infinite;animation-delay:var(--d,0ms)}
@keyframes nl-ping{0%{box-shadow:0 0 0 0 rgba(142,150,255,.55)}70%,100%{box-shadow:0 0 0 12px rgba(142,150,255,0)}}
.nl-step small{font-family:'Instrument Serif',serif;font-style:italic;font-size:36px;opacity:.9}
.nl-step h3{margin:10px 0 8px;font-size:19px;font-weight:500;letter-spacing:-.02em}
.nl-step p{margin:0;font-size:14.5px;line-height:1.55;opacity:.66}

/* arena preview */
.nl-arena-grid{display:grid;gap:clamp(28px,5vw,72px);grid-template-columns:repeat(auto-fit,minmax(320px,1fr));align-items:center}
.nl-points{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.nl-points li{display:flex;gap:12px;font-size:15.5px;opacity:.8;line-height:1.5}
.nl-points li::before{content:"";flex:none;width:8px;height:8px;border-radius:50%;background:#5DD6B0;margin-top:8px}
.nl-win{border-radius:20px;background:#171A24;border:1px solid rgba(241,239,234,.14);box-shadow:0 30px 80px -30px rgba(0,0,0,.8),0 0 0 1px rgba(142,150,255,.08);overflow:hidden}
.nl-bar{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid rgba(241,239,234,.1);font-size:12.5px;opacity:.9}
.nl-bar b{width:10px;height:10px;border-radius:50%;background:#FF5F57}
.nl-bar b:nth-child(2){background:#FEBC2E}.nl-bar b:nth-child(3){background:#28C840}
.nl-bar span{margin-left:10px;opacity:.6}
.nl-live{margin-left:auto;display:flex;align-items:center;gap:7px;color:#5DD6B0;opacity:1!important}
.nl-live::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;animation:nl-blink 1.4s infinite}
@keyframes nl-blink{50%{opacity:.25}}
.nl-stance{display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(241,239,234,.08);flex-wrap:wrap}
.nl-pill{display:inline-flex;align-items:center;gap:8px;padding:5px 12px;border-radius:999px;font-size:12px;background:rgba(241,239,234,.06)}
.nl-pill i{width:8px;height:8px;border-radius:50%;background:var(--c)}
.nl-msgs{height:268px;overflow:hidden;padding:16px;display:flex;flex-direction:column;gap:10px}
.nl-msg{max-width:82%;padding:10px 14px;border-radius:16px;font-size:13.5px;line-height:1.45;animation:nl-pop .45s cubic-bezier(.2,.9,.3,1.2)}
.nl-msg small{display:block;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;opacity:.6;margin-bottom:3px}
.nl-msg.buyer{align-self:flex-start;background:rgba(59,130,246,.18);border-bottom-left-radius:4px}
.nl-msg.vendor{align-self:flex-end;background:rgba(245,184,75,.16);border-bottom-right-radius:4px}
.nl-msg strong{color:#fff}
@keyframes nl-pop{from{opacity:0;transform:translateY(12px) scale(.96)}}
.nl-typing{display:flex;gap:4px;padding:12px 14px;border-radius:16px;width:58px}
.nl-typing.buyer{align-self:flex-start;background:rgba(59,130,246,.18)}.nl-typing.vendor{align-self:flex-end;background:rgba(245,184,75,.16)}
.nl-typing i{width:6px;height:6px;border-radius:50%;background:#F1EFEA;opacity:.5;animation:nl-dot 1s infinite}
.nl-typing i:nth-child(2){animation-delay:.15s}.nl-typing i:nth-child(3){animation-delay:.3s}
@keyframes nl-dot{40%{transform:translateY(-4px);opacity:1}}
.nl-chart{border-top:1px solid rgba(241,239,234,.08);padding:12px 16px 14px;position:relative}
.nl-chart-h{display:flex;justify-content:space-between;font-size:11.5px;opacity:.65;margin-bottom:4px}
.nl-deal{position:absolute;right:16px;bottom:16px;padding:6px 12px;border-radius:999px;background:#28C840;color:#06210F;font-size:12px;font-weight:600;animation:nl-pop .5s}

/* personalities */
.nl-meter{display:grid;grid-template-columns:104px 1fr 30px;gap:10px;align-items:center;font-size:12.5px;opacity:.85;margin-top:10px}
.nl-meter div{height:6px;border-radius:4px;background:rgba(241,239,234,.12);overflow:hidden}
.nl-meter i{display:block;height:100%;width:0;border-radius:4px;background:var(--c);transition:width 1.3s cubic-bezier(.2,.7,.2,1) .3s}
.nl-card.in .nl-meter i{width:var(--w)}
.nl-meter em{font-style:normal;text-align:right;font-variant-numeric:tabular-nums}

/* chips + cta */
.nl-chips{display:flex;flex-wrap:wrap;gap:10px}
.nl-chip{padding:10px 18px;border-radius:999px;border:1px solid rgba(241,239,234,.2);font-size:14px;transition:background .25s,color .25s,transform .25s}
.nl-chip:hover{background:#F1EFEA;color:${BG};transform:translateY(-2px)}
.nl-cta{position:relative;overflow:hidden;text-align:center;padding:clamp(80px,11vw,140px) 0}
.nl-cta h2{margin-left:auto;margin-right:auto;max-width:14ch}
.nl-cta p{opacity:.65;margin:0 auto 32px;max-width:46ch}
.nl-btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:10px;height:54px;padding:0 30px;border-radius:999px;background:#F1EFEA;color:${BG};text-decoration:none;font-weight:500;font-size:15.5px;transition:transform .3s cubic-bezier(.2,.7,.2,1),box-shadow .3s}
.nl-btn:hover{transform:translateY(-2px);box-shadow:0 14px 40px -12px rgba(142,150,255,.7)}
.nl-btn::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(142,150,255,.45) 50%,transparent 70%);transform:translateX(-120%);animation:nl-sweep 3.6s ease-in-out infinite}
@keyframes nl-sweep{55%,100%{transform:translateX(120%)}}
.nl-btn svg{transition:transform .3s}.nl-btn:hover svg{transform:translateX(4px)}

/* floating cta */
.nl-float{position:fixed;right:20px;bottom:20px;z-index:55;display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:999px;background:rgba(241,239,234,.92);color:${BG};text-decoration:none;font-size:14px;font-weight:500;backdrop-filter:blur(10px);
  box-shadow:0 10px 30px -10px rgba(0,0,0,.6);transform:translateY(90px);opacity:0;transition:transform .5s cubic-bezier(.2,.7,.2,1),opacity .4s}
.nl-float.on{transform:none;opacity:1}

/* footer */
.nl-foot{border-top:1px solid rgba(241,239,234,.12);padding:48px 0 28px}
.nl-fgrid{display:grid;gap:32px;grid-template-columns:2fr 1fr 1fr;margin-bottom:40px}
@media(max-width:700px){.nl-fgrid{grid-template-columns:1fr}}
.nl-foot h4{margin:0 0 14px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.5;font-weight:500}
.nl-foot a{display:block;color:inherit;text-decoration:none;opacity:.75;font-size:14.5px;padding:3px 0;transition:opacity .2s,transform .2s}
.nl-foot a:hover{opacity:1;transform:translateX(3px)}
.nl-foot p{margin:0;font-size:14.5px;line-height:1.6;opacity:.6;max-width:38ch}
.nl-fbot{display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;font-size:13px;opacity:.55;border-top:1px solid rgba(241,239,234,.1);padding-top:22px}
.nl-top{display:inline-flex;align-items:center;gap:8px;background:none;border:1px solid rgba(241,239,234,.25);color:inherit;border-radius:999px;padding:8px 16px;cursor:pointer;font:inherit;font-size:13px}
.nl-top:hover{background:#F1EFEA;color:${BG}}
.nl a:focus-visible,.nl button:focus-visible{outline:2px solid #F1EFEA;outline-offset:4px}
@media (prefers-reduced-motion:reduce){
  .nl *,.nl *::before,.nl *::after{animation:none!important;transition:none!important}
  .nl-rv{opacity:1;transform:none}
  html{scroll-behavior:auto}
}
`

/* ───────────── hooks and small components ───────────── */

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".nl-rv")
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in")
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.12 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

function ScrollUi() {
  const bar = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, p)})`
      setOn(h.scrollTop > window.innerHeight * 0.85)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  return (
    <>
      <div className="nl-progress" aria-hidden="true"><div ref={bar} /></div>
      <a className={"nl-float" + (on ? " on" : "")} href="#app" tabIndex={on ? 0 : -1}>
        Launch app <ArrowRight size={16} />
      </a>
    </>
  )
}

function Count({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setV(to)
      const t0 = performance.now()
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / 1400)
        setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    io.observe(el)
    return () => io.disconnect()
  }, [to])
  return <span ref={ref}>{v}</span>
}

const spot = (e: MouseEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`)
}

/** Looping, illustrative negotiation: messages type in, offers converge on a chart. */
function ArenaPreview() {
  const ref = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)
  const [n, setN] = useState(0)
  const len = MSGS.length

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!live) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(len)
      return
    }
    const t = window.setInterval(() => setN((x) => (x >= len + 3 ? 0 : x + 1)), 1700)
    return () => window.clearInterval(t)
  }, [live, len])

  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight
  }, [n])

  const shown = MSGS.slice(0, Math.min(n, len))
  const next = n < len ? MSGS[n] : null
  const round = Math.min(8, Math.max(1, Math.ceil(Math.min(n, len) / 2)))
  const X = (i: number) => 18 + i * (264 / 7)
  const Y = (o: number) => 98 - ((o - 60) / 80) * 86
  const line = (who: Msg["who"]) =>
    MSGS.map((m, i) => ({ m, i }))
      .filter(({ m, i }) => m.who === who && i < n)
      .map(({ m, i }) => `${X(i)},${Y(m.offer)}`)
      .join(" ")

  return (
    <div className="nl-win" ref={ref}>
      <div className="nl-bar">
        <b /><b /><b />
        <span>Negotiation Arena · Vendor Pricing</span>
        <span className="nl-live">Live</span>
      </div>
      <div className="nl-stance">
        <span className="nl-pill" style={vars({ "--c": "#3B82F6" })}><i />Buyer · Collaborative</span>
        <span className="nl-pill" style={vars({ "--c": "#F5B84B" })}><i />Vendor · Aggressive</span>
        <span className="nl-pill" style={vars({ "--c": "#8E96FF", marginLeft: "auto" })}>Round {round} / 8</span>
      </div>
      <div className="nl-msgs" ref={box} aria-live="off">
        {shown.map((m, i) => (
          <div className={"nl-msg " + m.who} key={i}>
            <small>{m.who === "buyer" ? "Procurement Manager" : "Vendor Sales Rep"}</small>
            {m.text}
          </div>
        ))}
        {next && live ? (
          <div className={"nl-typing " + next.who}><i /><i /><i /></div>
        ) : null}
      </div>
      <div className="nl-chart">
        <div className="nl-chart-h"><span>Offers per seat (USD)</span><span>Illustrative example</span></div>
        <svg viewBox="0 0 300 110" width="100%" role="img" aria-label="Buyer and vendor offers converging toward 98 dollars">
          <line x1="18" x2="282" y1={Y(98)} y2={Y(98)} stroke="rgba(241,239,234,.15)" strokeDasharray="3 5" />
          <polyline points={line("buyer")} fill="none" stroke="#3B82F6" strokeWidth="2.2" strokeLinejoin="round" />
          <polyline points={line("vendor")} fill="none" stroke="#F5B84B" strokeWidth="2.2" strokeLinejoin="round" />
          {MSGS.map((m, i) =>
            i < n ? <circle key={i} cx={X(i)} cy={Y(m.offer)} r="3.6" fill={m.who === "buyer" ? "#3B82F6" : "#F5B84B"} /> : null
          )}
        </svg>
        {n >= len ? <span className="nl-deal">Deal closed at $98</span> : null}
      </div>
    </div>
  )
}

/* ───────────── page ───────────── */

export default function LandingPage() {
  useReveal()
  const loop = [...TICKER, ...TICKER]
  return (
    <div className="nl">
      <style>{CSS}</style>
      <ScrollUi />

      <SculptureHero
        brand="NegotiateAI®"
        navLinks={[
          { label: "Features", href: "#features" },
          { label: "Arena", href: "#arena" },
          { label: "How it works", href: "#how" },
          { label: "Scenarios", href: "#scenarios" },
        ]}
        navCta={{ label: "Launch app", href: "#app" }}
        eyebrow="Infosys Springboard Virtual Internship — 2026"
        headline={"Negotiation,\nrehearsed by AI agents."}
        headlineAccent="rehearsed by AI agents."
        body="A multi-agent simulator where AI stakeholders negotiate with real goals, constraints and personalities. Watch them, or practice against them, then sync the deal to your calendar."
        primaryCta={{ label: "Launch simulator", href: "#app" }}
        secondaryCta={{ label: "See it negotiate", href: "#arena" }}
        backdropText="negotiate"
        theme="dark"
        themeToggle={false}
        ambient
        intro
        liquid={1.3}
        imageAlt="Abstract metallic particle sculpture that flows like liquid when the cursor moves over it"
      />

      <div className="nl-ticker" aria-hidden="true">
        <div className="nl-track">
          {loop.map((t, i) => (
            <span key={i}>{i % 2 ? t : <>{t}</>}{" "}<i>✦</i></span>
          ))}
        </div>
      </div>

      <section className="nl-sec">
        <div className="nl-wrap nl-rv">
          <div className="nl-stats">
            {STATS.map((s) => (
              <div className="nl-stat" key={s.l}>
                <b><Count to={s.to} /></b>
                <span>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="nl-sec" id="features" style={{ paddingTop: 0 }}>
        <div className="nl-orb" style={vars({ "--c": "#8E96FF", left: "-12%", top: "8%" })} />
        <div className="nl-wrap">
          <p className="nl-eyebrow nl-rv">Features</p>
          <h2 className="nl-rv">Everything a <em>negotiation lab</em> needs.</h2>
          <p className="nl-lead nl-rv">Realistic, repeatable and scalable practice for procurement, sales, hiring and budget decisions.</p>
          <div className="nl-grid">
            {FEATURES.map((f, i) => (
              <article className="nl-card nl-rv" key={f.title} onMouseMove={spot} style={vars({ "--c": f.c, "--d": `${(i % 3) * 90}ms` })}>
                <div className="nl-ic"><f.icon size={22} /></div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="nl-sec" id="arena">
        <div className="nl-orb" style={vars({ "--c": "#3B82F6", right: "-14%", top: "20%", animationDelay: "-5s" })} />
        <div className="nl-wrap nl-arena-grid">
          <div>
            <p className="nl-eyebrow nl-rv">Negotiation Arena</p>
            <h2 className="nl-rv">Watch a deal <em>take shape.</em></h2>
            <p className="nl-lead nl-rv" style={{ marginBottom: 28 }}>Every turn shows who is speaking, what they offered and how far the two sides still are from agreement.</p>
            <ul className="nl-points nl-rv">
              <li>Agents reason from their own goals, limits and personality.</li>
              <li>Offers converge on a chart, so concession patterns are easy to read.</li>
              <li>Stalled talks are detected and resolved, or declared a breakdown.</li>
            </ul>
          </div>
          <div className="nl-rv" style={vars({ "--d": "120ms" })}>
            <ArenaPreview />
          </div>
        </div>
      </section>

      <section className="nl-sec" id="how">
        <div className="nl-wrap">
          <p className="nl-eyebrow nl-rv">How it works</p>
          <h2 className="nl-rv">From scenario to signed deal in <em>four steps.</em></h2>
          <div className="nl-steps nl-rv" style={{ marginTop: 56 }}>
            {STEPS.map((s, i) => (
              <div className="nl-step" key={s.n} style={vars({ "--d": `${i * 350}ms` })}>
                <small>{s.n}</small>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="nl-sec" id="personalities" style={{ paddingTop: 0 }}>
        <div className="nl-wrap">
          <p className="nl-eyebrow nl-rv">Personalities</p>
          <h2 className="nl-rv">Same table. <em>Different temperament.</em></h2>
          <div className="nl-grid" style={{ marginTop: 40 }}>
            {PERSONALITIES.map((p, i) => (
              <article className="nl-card nl-rv" key={p.name} onMouseMove={spot} style={vars({ "--c": p.c, "--d": `${i * 120}ms` })}>
                <div className="nl-ic"><p.icon size={22} /></div>
                <h3>{p.name}</h3>
                <p>{p.text}</p>
                <div style={{ marginTop: 14 }}>
                  {p.traits.map(([k, v]) => (
                    <div className="nl-meter" key={k}>
                      <span>{k}</span>
                      <div><i style={vars({ "--w": `${v}%` })} /></div>
                      <em>{v}</em>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="nl-sec" id="scenarios" style={{ paddingTop: 0 }}>
        <div className="nl-orb" style={vars({ "--c": "#10B981", left: "30%", bottom: "-30%", animationDelay: "-8s" })} />
        <div className="nl-wrap">
          <p className="nl-eyebrow nl-rv">Scenarios</p>
          <h2 className="nl-rv">Three templates. <em>Zero setup.</em></h2>
          <p className="nl-lead nl-rv">Each comes with predefined agents, goals, constraints and default personalities. Customize the personalities before you start.</p>
          <div className="nl-grid">
            {SCENARIOS.map((s, i) => (
              <article className="nl-card nl-rv" key={s.title} onMouseMove={spot} style={vars({ "--c": s.color, "--d": `${i * 120}ms` })}>
                <div className="nl-ic"><s.icon size={22} /></div>
                <h3>{s.title}</h3>
                <p className="nl-agents">{s.agents}</p>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="nl-sec" id="stack" style={{ paddingTop: 0 }}>
        <div className="nl-wrap">
          <p className="nl-eyebrow nl-rv">Built with</p>
          <div className="nl-chips nl-rv">
            {STACK.map((t) => (
              <span className="nl-chip" key={t}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="nl-cta">
        <div className="nl-orb" style={vars({ "--c": "#8E96FF", left: "50%", top: "-20%", marginLeft: -280 })} />
        <div className="nl-wrap">
          <h2 className="nl-rv">Ready to <em>sit at the table?</em></h2>
          <p className="nl-rv">Pick a scenario, set the personalities and let the agents negotiate.</p>
          <a className="nl-btn nl-rv" href="#app">
            Launch simulator <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <footer className="nl-foot">
        <div className="nl-wrap">
          <div className="nl-fgrid">
            <div>
              <h4>NegotiateAI®</h4>
              <p>Multi-Agent Negotiation and Calendar Scheduling Platform, built for the Infosys Springboard Virtual Internship.</p>
            </div>
            <div>
              <h4>Explore</h4>
              <a href="#features">Features</a>
              <a href="#arena">Arena</a>
              <a href="#how">How it works</a>
              <a href="#scenarios">Scenarios</a>
            </div>
            <div>
              <h4>Product</h4>
              <a href="#app">Launch simulator</a>
              <a href="#personalities">Personalities</a>
              <a href="#stack">Tech stack</a>
            </div>
          </div>
          <div className="nl-fbot">
            <span>© 2026 NegotiateAI · Infosys Springboard Virtual Internship</span>
            <button className="nl-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              Back to top <ArrowUp size={14} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
