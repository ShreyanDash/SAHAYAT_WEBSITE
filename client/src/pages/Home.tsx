import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BatteryCharging,
  BellRing,
  Check,
  ChevronDown,
  Crosshair,
  HeartPulse,
  LocateFixed,
  Menu,
  MoveUpRight,
  Play,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Watch,
  X,
  Zap,
} from "lucide-react";
import Lenis from "lenis";

const DETAIL_IMAGE = "/manus-storage/async-images/McTG4xEtu1AlnNXqn9y0Bq/image-2.webp";
const CAREGIVER_IMAGE = "/manus-storage/async-images/McTG4xEtu1AlnNXqn9y0Bq/image-3.webp";
const BAND_IMAGE = "/sahayat-band-cutout.png";

const featureCards = [
  {
    number: "01",
    icon: Activity,
    title: "Motion intelligence",
    copy: "A quiet layer of sensing learns the difference between a normal moment and a pattern worth acting on.",
    tag: "Always on",
  },
  {
    number: "02",
    icon: HeartPulse,
    title: "Vitals, without the noise",
    copy: "Heart rate and SpO₂ tracking give caregivers context when context matters most.",
    tag: "Heart + oxygen",
  },
  {
    number: "03",
    icon: BellRing,
    title: "Acts when you can't",
    copy: "Potential seizure-like episodes, falls or SOS events can trigger a calm, coordinated response.",
    tag: "Emergency layer",
  },
  {
    number: "04",
    icon: LocateFixed,
    title: "The right people, the right place",
    copy: "Live location sharing helps a trusted caregiver move from alert to action with less delay.",
    tag: "Live location",
  },
  {
    number: "05",
    icon: Smartphone,
    title: "Built for the circle around you",
    copy: "The dedicated Android app keeps alerts, status and health-event history close at hand.",
    tag: "Android app",
  },
  {
    number: "06",
    icon: BatteryCharging,
    title: "Screenless by design",
    copy: "No buzzing dashboard. No visual distraction. Just a comfortable companion that stays out of the way.",
    tag: "Lightweight form",
  },
];

const modes = [
  { id: "signal", label: "Signal", eyebrow: "Stay ahead", title: "A wearable that notices the moment before the moment becomes a crisis.", body: "SAHAYAT quietly watches for abnormal motion and vital changes, so the people around you can respond sooner.", icon: Crosshair },
  { id: "assist", label: "Assist", eyebrow: "Move with confidence", title: "When help is needed, the next step is already in motion.", body: "Emergency alerts, live location and the dedicated Android app turn a private event into a shared response.", icon: ShieldCheck },
  { id: "history", label: "History", eyebrow: "See the pattern", title: "Every event becomes useful context for the people who care.", body: "Review health-event history to understand what happened, what changed and what to look out for next.", icon: Activity },
];

const journeySteps = [
  { label: "01", title: "The signal", copy: "Motion sensing notices when a pattern stops looking like an ordinary day.", icon: Crosshair },
  { label: "02", title: "The vitals", copy: "Heart rate and SpO₂ add context without putting a screen between you and the moment.", icon: HeartPulse },
  { label: "03", title: "The response", copy: "An alert reaches the people you trust, with location and health-event context attached.", icon: BellRing },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function BandVisual({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`band-visual ${compact ? "band-visual--compact" : ""}`} aria-label="SAHAYAT screenless wristband product render" role="img">
      <img src={BAND_IMAGE} alt="SAHAYAT black woven screenless safety band" className="band-photo" />
    </div>
  );
}

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMode, setActiveMode] = useState("signal");
  const [showDetails, setShowDetails] = useState(false);
  const [heroScroll, setHeroScroll] = useState(0);
  const [journeyProgress, setJourneyProgress] = useState(0);
  const journeyRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = reduceMotion ? null : new Lenis({ lerp: 0.085, smoothWheel: true, syncTouch: false });
    let raf = 0;
    const tick = (time: number) => {
      lenis?.raf(time);
      raf = window.requestAnimationFrame(tick);
    };
    if (lenis) raf = window.requestAnimationFrame(tick);

    const onScroll = () => {
      setHeroScroll(Math.min(window.scrollY / (window.innerHeight * 0.9), 1));
      const journey = journeyRef.current;
      if (!journey) return;
      const bounds = journey.getBoundingClientRect();
      const travel = Math.max(journey.offsetHeight - window.innerHeight, 1);
      setJourneyProgress(Math.max(0, Math.min(1, -bounds.top / travel)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);

  useEffect(() => {
    const revealNodes = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.12 },
    );
    revealNodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const currentMode = useMemo(() => modes.find((mode) => mode.id === activeMode) ?? modes[0], [activeMode]);
  const ModeIcon = currentMode.icon;
  const activeJourneyIndex = Math.min(journeySteps.length - 1, Math.floor(journeyProgress * journeySteps.length));
  const JourneyIcon = journeySteps[activeJourneyIndex].icon;
  const journeyStyle = {
    transform: `translate3d(0, ${journeyProgress * -12}px, 0) rotate(${journeyProgress * 18 - 9}deg) scale(${1 + journeyProgress * 0.58})`,
  };

  return (
    <main className="sahayat-site">
      <header className={`site-header ${heroScroll > 0.12 ? "site-header--scrolled" : ""}`}>
        <button className="brand-lockup" onClick={() => scrollToId("top")} aria-label="Back to top">
          <span className="brand-symbol"><span /></span>
          <span>SAHAYAT</span>
        </button>
        <nav className={`site-nav ${menuOpen ? "site-nav--open" : ""}`} aria-label="Main navigation">
          <button onClick={() => { scrollToId("system"); setMenuOpen(false); }}>The system</button>
          <button onClick={() => { scrollToId("story"); setMenuOpen(false); }}>How it helps</button>
          <button onClick={() => { scrollToId("order"); setMenuOpen(false); }}>Get SAHAYAT</button>
        </nav>
        <button className="header-cta" onClick={() => scrollToId("order")}>
          <span>Explore</span><ArrowUpRight size={15} />
        </button>
        <button className="menu-toggle" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu" aria-expanded={menuOpen}>
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      <section className="hero" id="top">
        <div className="hero-grain" />
        <div className="hero-orbit hero-orbit--one" />
        <div className="hero-orbit hero-orbit--two" />
        <div className="hero-copy">
          <div className="eyebrow hero-eyebrow"><span className="eyebrow-dot" /> Intelligent safety, made personal</div>
          <h1>When you<br /><em>can’t</em>,<br /><strong>SAHAYAT.</strong></h1>
          <p className="hero-tagline">Every fitband monitors you, but SAHAYAT acts when you can't.</p>
          <div className="hero-actions">
            <button className="button button--lime" onClick={() => scrollToId("order")}>
              Discover the band <ArrowRight size={16} />
            </button>
            <button className="text-button" onClick={() => scrollToId("system")}><span className="play-icon"><Play size={11} fill="currentColor" /></span> See how it responds</button>
          </div>
        </div>
        <div className="hero-product">
          <div className="hero-product-label"><span>SAHAYAT / 01</span><span>SCREENLESS SAFETY WEARABLE</span></div>
          <div className="hero-product-image-wrap">
            <BandVisual />
          </div>
          <div className="hero-metric hero-metric--top"><span className="metric-line" /><span>01 / 03</span></div>
          <div className="hero-metric hero-metric--bottom"><span>Motion + vitals</span><span className="metric-line metric-line--short" /></div>
        </div>
        <div className="hero-footer">
          <span>Scroll to enter</span><span className="scroll-line"><i /></span><span>Built for the moments that matter</span>
        </div>
      </section>

      <section className="scroll-journey" ref={journeyRef} aria-label="Scroll through the SAHAYAT response system">
        <div className="scroll-journey-sticky">
          <div className="journey-backdrop" style={{ opacity: 0.34 + journeyProgress * 0.28 }} />
          <div className="journey-header">
            <div className="section-kicker"><span>00</span><span>Scroll through the system</span><span className="kicker-rule" /></div>
            <span className="journey-progress-label">{String(Math.round(journeyProgress * 100)).padStart(2, "0")} / 100</span>
          </div>
          <div className="journey-stage">
            <div className="journey-copy journey-copy--left">
              <span className="journey-overline">{journeySteps[activeJourneyIndex].label} / SAHAYAT ONE</span>
              <h2>Scroll to<br /><span>see it think.</span></h2>
              <p>Every layer is designed to stay quiet until it has something meaningful to say.</p>
            </div>
            <div className="journey-product-wrap">
              <div className="journey-ring journey-ring--one" />
              <div className="journey-ring journey-ring--two" />
              <div className="journey-product" style={journeyStyle}><BandVisual /></div>
              <div className="journey-scan-line" style={{ top: `${25 + journeyProgress * 50}%` }}><span /><span>SCANNING / {journeySteps[activeJourneyIndex].label}</span></div>
            </div>
            <div className="journey-copy journey-copy--right">
              <div className="journey-step-icon"><JourneyIcon size={23} strokeWidth={1.4} /></div>
              <span className="journey-overline">{journeySteps[activeJourneyIndex].label} / {journeySteps[activeJourneyIndex].title}</span>
              <h3>{journeySteps[activeJourneyIndex].title}</h3>
              <p>{journeySteps[activeJourneyIndex].copy}</p>
              <div className="journey-steps" aria-hidden="true">{journeySteps.map((step, index) => <span key={step.label} className={index === activeJourneyIndex ? "is-active" : ""} />)}</div>
            </div>
          </div>
          <div className="journey-footer"><span>Scroll slowly</span><span className="journey-line"><i style={{ width: `${Math.max(8, journeyProgress * 100)}%` }} /></span><span>Signal → vitals → response</span></div>
        </div>
      </section>

      <section className="manifesto section-shell reveal" id="system">
        <div className="section-kicker"><span>01</span><span>Beyond fitness</span><span className="kicker-rule" /></div>
        <div className="manifesto-layout">
          <h2>Not another<br /><span>scorecard.</span></h2>
          <div className="manifesto-copy">
            <p className="large-copy">Most wearables tell you what happened. <strong>SAHAYAT helps with what happens next.</strong></p>
            <p>Designed for people who may need help before they can ask for it — and for the caregivers who want to be ready without hovering.</p>
            <button className="circle-link" onClick={() => scrollToId("story")} aria-label="Continue to the story"><ArrowDownRight size={20} /></button>
          </div>
        </div>
        <div className="manifesto-stats">
          <div><span className="stat-value">24/7</span><span className="stat-label">quiet monitoring</span></div>
          <div><span className="stat-value">3×</span><span className="stat-label">layers of signal</span></div>
          <div><span className="stat-value">0</span><span className="stat-label">screens to distract</span></div>
        </div>
      </section>

      <section className="product-section section-shell" id="order">
        <div className="product-card reveal">
          <div className="product-card-visual">
            <div className="product-card-stamp">SAHAYAT<br /><span>ONE</span></div>
            <BandVisual compact />
            <div className="product-visual-caption"><span>01</span><span>Matte black / brushed metal</span></div>
          </div>
          <div className="product-card-info">
            <div className="section-kicker"><span>02</span><span>The band</span></div>
            <p className="product-pretitle">SAHAYAT ONE</p>
            <h2>Quiet on the wrist.<br /><span>Ready for more.</span></h2>
            <p className="product-description">A screenless safety wearable that pairs a comfortable fit with an intelligent response layer. Built to fade into your day until it needs to step forward.</p>
            <div className="price-row"><span className="price price--coming">Coming soon</span><span className="price-note">early access opening shortly</span></div>
            <div className="product-points"><span><Check size={14} /> 12-month warranty</span><span><Check size={14} /> Android app included</span><span><Check size={14} /> Free caregiver setup</span></div>
            <button className="button button--lime button--wide" onClick={() => setShowDetails(true)}>Explore SAHAYAT ONE <ArrowRight size={16} /></button>
            <button className="product-link" onClick={() => scrollToId("story")}>See what it can do <ArrowDownRight size={15} /></button>
          </div>
        </div>
      </section>

      <section className="feature-section section-shell reveal">
        <div className="feature-heading">
          <div className="section-kicker"><span>03</span><span>The intelligence inside</span><span className="kicker-rule" /></div>
          <h2>Small form.<br /><span>Big responsibility.</span></h2>
          <p>Everything you need from a safety companion. Nothing you don’t.</p>
        </div>
        <div className="feature-grid">
          {featureCards.map(({ number, icon: Icon, title, copy, tag }) => (
            <article className="feature-card" key={number}>
              <div className="feature-card-top"><span className="feature-number">{number}</span><Icon size={22} strokeWidth={1.5} /></div>
              <h3>{title}</h3>
              <p>{copy}</p>
              <span className="feature-tag">{tag}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="story-section" id="story">
        <div className="story-image-wrap reveal"><img src={DETAIL_IMAGE} alt="Close-up detail of the SAHAYAT wristband" /><div className="image-overlay-label"><span>THE OBJECT</span><span>01 — 03</span></div></div>
        <div className="story-copy section-shell reveal">
          <div className="section-kicker"><span>04</span><span>Designed to disappear</span></div>
          <h2>Safety should<br /><span>feel effortless.</span></h2>
          <p>Soft-touch materials. A low-profile identity plate. A fit you forget is there — until SAHAYAT makes sure you’re not alone in the moment you need help.</p>
          <div className="detail-list"><div><span>01</span><strong>Screenless by choice</strong><p>No feed, no pings, no extra noise.</p></div><div><span>02</span><strong>Made for every day</strong><p>Comfortable enough to sleep, move and live in.</p></div><div><span>03</span><strong>Clearly yours</strong><p>A minimal metal plate makes it personal.</p></div></div>
        </div>
      </section>

      <section className="response-section section-shell reveal">
        <div className="response-intro">
          <div className="section-kicker"><span>05</span><span>Three ways SAHAYAT stays close</span></div>
          <h2>From signal<br />to <span>support.</span></h2>
          <p>Choose a layer to see the experience from the wearer’s side — and the caregiver’s.</p>
        </div>
        <div className="response-interface">
          <div className="mode-tabs" role="tablist" aria-label="SAHAYAT response modes">
            {modes.map((mode, index) => <button key={mode.id} className={activeMode === mode.id ? "mode-tab mode-tab--active" : "mode-tab"} onClick={() => setActiveMode(mode.id)} role="tab" aria-selected={activeMode === mode.id}><span>0{index + 1}</span>{mode.label}<ArrowRight size={14} /></button>)}
          </div>
          <div className="mode-panel">
            <div className="mode-panel-icon"><ModeIcon size={28} strokeWidth={1.2} /></div>
            <div><span className="mode-eyebrow">{currentMode.eyebrow}</span><h3>{currentMode.title}</h3><p>{currentMode.body}</p><button className="text-button text-button--lime" onClick={() => setShowDetails(true)}>Open the full system <ArrowRight size={15} /></button></div>
          </div>
        </div>
      </section>

      <section className="caregiver-section section-shell reveal">
        <div className="caregiver-copy">
          <div className="section-kicker"><span>06</span><span>The circle around you</span></div>
          <h2>Help is a<br /><span>shared language.</span></h2>
          <p>SAHAYAT turns an individual event into a clear next step. Alerts go to the people you trust, with the context they need to act.</p>
          <div className="caregiver-points"><span><span className="point-dot" />Automatic alerts</span><span><span className="point-dot" />Live location sharing</span><span><span className="point-dot" />Health-event history</span></div>
        </div>
        <div className="caregiver-image-wrap"><img src={CAREGIVER_IMAGE} alt="Caregiver using the SAHAYAT Android app" /><div className="phone-ui"><div className="phone-ui-top"><span className="status-dot" />SAHAYAT<span>•••</span></div><div className="phone-alert"><BellRing size={17} /><div><span>Potential event detected</span><strong>Caregiver notified</strong></div></div><div className="phone-map"><img src="/sahayat-live-map.svg" alt="SAHAYAT live location map with an active caregiver route" /><span className="map-pulse" /><span className="map-route" /><span className="map-label">LIVE LOCATION</span></div><div className="phone-bottom"><span>Responding now</span><ArrowRight size={14} /></div></div></div>
      </section>

      <section className="closing-section section-shell reveal">
        <div className="closing-rule" />
        <div className="closing-mark"><span className="brand-symbol brand-symbol--large"><span /></span><span>SAHAYAT</span></div>
        <h2>Ready when<br /><span>you can’t be.</span></h2>
        <p>Join the first circle of people building a safer everyday.</p>
        <button className="button button--lime" onClick={() => setShowDetails(true)}>Register your interest <ArrowRight size={16} /></button>
        <div className="footer-meta"><span>© 2026 SAHAYAT</span><span>Intelligent safety wearable / India</span><button onClick={() => scrollToId("top")}>Back to top <ChevronDown size={14} className="rotate-180" /></button></div>
      </section>

      {showDetails && <div className="details-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="details-backdrop" onClick={() => setShowDetails(false)} />
        <div className="details-panel">
          <button className="modal-close" onClick={() => setShowDetails(false)} aria-label="Close details"><X size={19} /></button>
          <div className="details-panel-visual"><BandVisual compact /><span>SAHAYAT ONE / SYSTEM VIEW</span></div>
          <div className="details-panel-copy"><span className="eyebrow"><span className="eyebrow-dot" /> Full system overview</span><h2 id="modal-title">A calmer kind<br /><span>of connected.</span></h2><p>SAHAYAT is an envisioned product concept. We’re building the safety layer now — with a screenless band, a dedicated Android companion and an alert system designed around caregivers.</p><div className="modal-form"><label htmlFor="email">Get the early access note</label><div className="email-row"><input id="email" type="email" placeholder="you@email.com" /><button className="button button--lime" onClick={() => setShowDetails(false)}>Notify me <ArrowRight size={15} /></button></div></div><small>No spam. Just the occasional meaningful update.</small></div>
        </div>
      </div>}
    </main>
  );
}

export default Home;
