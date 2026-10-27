import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  FileText,
  Sparkles,
  Feather,
} from "lucide-react";
import { Header, Footer } from "@/components/header";
import { templates } from "@/lib/templates";
export const metadata = { alternates: { canonical: "/" } };
export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="dot" /> A WORKSPACE FOR RADIOLOGY LEARNERS
            </div>
            <h1>
              Read the evidence.
              <br />
              Write your
              <br />
              <em>understanding.</em>
            </h1>
            <p>
              Bring your notes, the literature, and a little writing support
              into one quiet space. Make complex ideas your own.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/workspace">
                Start writing <ArrowRight size={18} />
              </Link>
              <Link
                className="text-link"
                href="/workspace?template=imaging-technique"
              >
                Explore a sample note <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="micro">
              <Check size={14} /> No account needed <span>·</span> Saved on your
              device
            </div>
          </div>
          <div className="hero-preview">
            <div className="preview-bar">
              <span className="preview-dot" />
              <span className="preview-dot" />
              <span className="preview-dot" />
              <span>YOUR NEXT MOMENT OF CLARITY</span>
            </div>
            <div className="preview-content">
              <div className="eyebrow">
                LEARNING NOTE <span> / </span> MRI FUNDAMENTALS
              </div>
              <h2>
                Understanding
                <br />
                diffusion-weighted MRI
              </h2>
              <div className="preview-meta">
                <FileText size={13} /> Technique explainer <span>·</span>{" "}
                Example workspace
              </div>
              <hr />
              <h3>Start with the principle.</h3>
              <p className="preview-highlight">
                What does diffusion weighting tell us about the movement of
                water molecules?
              </p>
              <p className="preview-muted">
                Build the explanation in your own words. Bring in a source,
                connect the ideas, and leave yourself a better question.
              </p>
              <div className="preview-source">
                <BookOpen size={20} />
                <div>
                  <b>Give every idea a place to start.</b>
                  <span>Find literature and keep your references close.</span>
                </div>
                <ArrowUpRight size={16} />
              </div>
            </div>
            <div className="floating-note">
              <Sparkles size={18} />
              <div>
                <b>Your words. A clearer version.</b>
                <span>Review every AI suggestion before applying.</span>
              </div>
            </div>
          </div>
        </section>
        <div className="principles">
          <span>
            <BookOpen size={18} /> Evidence within reach
          </span>
          <span>
            <Feather size={18} /> Space to think clearly
          </span>
          <span>
            <Sparkles size={18} /> Assistance you control
          </span>
        </div>
        <section className="section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">FROM READING TO UNDERSTANDING</div>
              <h2>A workflow that follows your thinking.</h2>
            </div>
            <p>
              Less switching between tabs.
              <br />
              More connecting the dots.
            </p>
          </div>
          <div className="steps">
            {[
              [
                "01",
                "Make room for an idea",
                "Start a fresh note or use a structured template. Write in English, Arabic, or both.",
              ],
              [
                "02",
                "Bring the evidence closer",
                "Search Europe PMC, explore papers, and insert citations that stay organized.",
              ],
              [
                "03",
                "Make it your own",
                "Review AI edits, create revision cards, and take your work with you.",
              ],
            ].map(([n, t, d]) => (
              <article key={n}>
                <span className="step-number">{n}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="section template-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">A THOUGHTFUL STARTING POINT</div>
              <h2>Skip the blank-page feeling.</h2>
            </div>
            <Link className="text-link" href="/templates">
              All templates <ArrowRight size={16} />
            </Link>
          </div>
          <div className="template-grid">
            {templates.slice(0, 3).map((t) => (
              <Link
                className="template-card"
                href={`/templates/${t.slug}`}
                key={t.slug}
              >
                <FileText size={24} />
                <span className="eyebrow">{t.category}</span>
                <h3>{t.title}</h3>
                <p>{t.description}</p>
                <span className="text-link">
                  Explore template <ArrowUpRight size={15} />
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className="closing">
          <Feather size={32} />
          <h2>
            Good notes are thinking,
            <br />
            <em>made visible.</em>
          </h2>
          <Link href="/workspace" className="button">
            Find your starting point <ArrowRight size={17} />
          </Link>
          <p>
            For learning and teaching. Not for patient records or clinical
            decisions.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
