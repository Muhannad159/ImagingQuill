import Link from "next/link";
import { Header, Footer } from "@/components/header";
import { templates } from "@/lib/templates";
import { ArrowUpRight, FileText } from "lucide-react";
export const metadata = {
  title: "Writing templates",
  alternates: { canonical: "/templates" },
};
export default function Templates() {
  return (
    <>
      <Header />
      <main className="page">
        <div className="eyebrow">A LITTLE STRUCTURE GOES A LONG WAY</div>
        <h1>Start with a good question.</h1>
        <p className="lead">
          Original frameworks for learning, appraising, teaching, and
          remembering.
        </p>
        <div className="template-grid">
          {templates.map((t) => (
            <Link
              className="template-card"
              href={`/templates/${t.slug}`}
              key={t.slug}
            >
              <FileText />
              <span className="eyebrow">{t.category}</span>
              <h2>{t.title}</h2>
              <p>{t.description}</p>
              <span className="text-link">
                See template <ArrowUpRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
