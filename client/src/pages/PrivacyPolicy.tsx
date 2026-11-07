import { ArrowLeft, ArrowUpRight, ShieldCheck } from "lucide-react";

const sections = [
  {
    number: "01",
    title: "What this policy covers",
    body: "This Privacy Policy explains how SAHAYAT handles information collected through this website and its early-access registration form. SAHAYAT is an envisioned healthcare safety wearable and companion experience. This website is currently used to share product information and collect interest in launch updates.",
  },
  {
    number: "02",
    title: "Information you choose to share",
    body: "When you register your interest, we collect your email address and the date and time of your consent. We use this information to save your place on the early-access list, send the registration confirmation, and share occasional SAHAYAT product or launch updates. You can choose not to register and browse the website without providing personal information.",
  },
  {
    number: "03",
    title: "How we use information",
    body: "We use registration information to operate the early-access list, respond to your requests, understand launch interest, and keep our communications relevant. We do not use your email address to make automated medical decisions, provide medical advice, or sell advertising profiles.",
  },
  {
    number: "04",
    title: "Email and service providers",
    body: "Registration confirmations and operational notifications may be sent through our email service provider. Service providers receive only the information needed to perform their service and are expected to protect it. We do not sell or rent registration email addresses to third parties.",
  },
  {
    number: "05",
    title: "Future product data",
    body: "The planned SAHAYAT wearable and Android application may process motion, heart-rate, SpO₂, fall-detection, emergency-event, and location information when those features are available and enabled. Those services will have additional notices, controls, and consent choices before any such health or location data is collected. This website does not currently collect wearable sensor data.",
  },
  {
    number: "06",
    title: "Retention and security",
    body: "We keep early-access registration information only for as long as reasonably needed to operate the list, communicate with you, meet legal obligations, resolve disputes, and maintain security. We use reasonable technical and organizational safeguards, but no online transmission or storage system can be guaranteed to be completely secure.",
  },
  {
    number: "07",
    title: "Your choices",
    body: "You may ask us to correct or delete your registration information, or to stop sending product updates. You can also unsubscribe from an email using the instructions in that message. Requests may be subject to reasonable verification so we do not change or disclose information to the wrong person.",
  },
];

export default function PrivacyPolicy() {
  return (
    <main className="privacy-page">
      <header className="privacy-header">
        <a className="brand-lockup" href="/" aria-label="Back to SAHAYAT home">
          <span className="brand-symbol"><span /></span>
          <span>SAHAYAT</span>
        </a>
        <a className="privacy-back" href="/"><ArrowLeft size={15} /> Back to home</a>
      </header>

      <section className="privacy-hero">
        <div className="section-kicker"><span>LEGAL / 01</span><span>Privacy, by design</span><span className="kicker-rule" /></div>
        <div className="privacy-hero-grid">
          <div>
            <div className="privacy-shield"><ShieldCheck size={26} strokeWidth={1.2} /></div>
            <h1>Your data.<br /><span>Your choice.</span></h1>
          </div>
          <div className="privacy-lede">
            <p>SAHAYAT is built around a simple idea: safety should feel supportive, not intrusive. This policy explains what we collect today, why we collect it, and the choices you have.</p>
            <p className="privacy-updated">Last updated: 8 November 2026</p>
          </div>
        </div>
      </section>

      <section className="privacy-content">
        <div className="privacy-intro">
          <span className="privacy-index">SAHAYAT / PRIVACY POLICY</span>
          <p>This policy applies to <strong>sahayat</strong> website experiences and early-access registrations. It does not replace any product-specific notice that may be provided with the wearable or Android application in the future.</p>
        </div>
        <div className="privacy-sections">
          {sections.map((section) => (
            <article className="privacy-section" key={section.number}>
              <span className="privacy-number">{section.number}</span>
              <div>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="privacy-footer">
        <div className="privacy-footer-mark"><span className="brand-symbol brand-symbol--large"><span /></span><span>SAHAYAT</span></div>
        <div className="privacy-contact">
          <span>Questions, requests or concerns?</span>
          <a href="mailto:sahayatcare@gmail.com">sahayatcare@gmail.com <ArrowUpRight size={15} /></a>
        </div>
        <div className="privacy-footer-meta"><span>© 2026 SAHAYAT</span><span>Intelligent safety wearable / India</span><a href="/">Return to SAHAYAT <ArrowUpRight size={14} /></a></div>
      </footer>
    </main>
  );
}
