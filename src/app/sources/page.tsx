import { Header, Footer } from "@/components/header";
export const metadata = {
  title: "Sources and responsible use",
  alternates: { canonical: "/sources" },
};
export default function Sources() {
  return (
    <>
      <Header />
      <main className="page narrow prose">
        <div className="eyebrow">KEEP THE SOURCE IN SIGHT</div>
        <h1>Evidence deserves context.</h1>
        <h2>Literature from Europe PMC.</h2>
        <p>
          ImagingQuill uses the public Europe PMC API for literature discovery
          and bibliographic metadata. We are an independent educational project,
          not affiliated with or endorsed by Europe PMC, its funders, or
          publishers. Search results may include preliminary or outdated
          research.
        </p>
        <p>
          <a href="https://europepmc.org/RestfulWebService">
            API documentation
          </a>{" "}
          · <a href="https://europepmc.org/Copyright">Copyright and reuse</a>
        </p>
        <h2>Open access is not one licence.</h2>
        <p>
          Each article retains its own rights. AI source workflows support
          explicitly identified CC BY and CC0 content. Attribution and source
          links remain available. Other articles can still be discovered and
          cited; read their content on the original website.
        </p>
        <h2>AI drafts need your judgment.</h2>
        <p>
          AI can misunderstand evidence, translate terminology incorrectly, or
          produce unsupported statements. Source links are aids to verification,
          not proof that an answer is correct. Review the original passages and
          approve every proposed edit.
        </p>
        <h2>Learning, not clinical practice.</h2>
        <p>
          Use this workspace for educational notes and fictional exercises. It
          does not interpret images, diagnose conditions, produce patient
          reports, or recommend treatment. Templates and example prose are
          original educational scaffolds, not validated medical guidance.
        </p>
      </main>
      <Footer />
    </>
  );
}
