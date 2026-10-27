import Link from "next/link";
import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/header";
import { templates } from "@/lib/templates";
export function generateStaticParams() {
  return templates.map((t) => ({ slug: t.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: templates.find((t) => t.slug === slug)?.title,
    alternates: { canonical: `/templates/${slug}` },
  };
}
export default async function Template({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = templates.find((t) => t.slug === slug);
  if (!t) notFound();
  return (
    <>
      <Header />
      <main className="page narrow">
        <Link href="/templates" className="text-link">
          ← All templates
        </Link>
        <div className="eyebrow">{t.category}</div>
        <h1>{t.title}</h1>
        <p className="lead">{t.description}</p>
        <div className="paper-sheet">
          <h2>{t.heading}</h2>
          <p>{t.intro}</p>
          {t.sections.map((s) => (
            <section key={s}>
              <h3>{s}</h3>
              <div className="ruled-line" />
            </section>
          ))}
        </div>
        <Link className="button" href={`/workspace?template=${slug}`}>
          Use this template →
        </Link>
      </main>
      <Footer />
    </>
  );
}
