import { Header, Footer } from "@/components/header";
export const metadata = {
  title: "Privacy",
  alternates: { canonical: "/privacy" },
};
export default function Privacy() {
  return (
    <>
      <Header />
      <main className="page narrow prose">
        <div className="eyebrow">YOUR WRITING, YOUR CHOICE</div>
        <h1>Privacy, in plain language.</h1>
        <h2>Your notes stay in this browser.</h2>
        <p>
          Documents, images, references and local snapshots are stored in
          IndexedDB on your device. There is no account or cloud document sync.
          Clearing browser data can delete them. Export a backup regularly; a
          downloaded backup contains your writing and images.
        </p>
        <h2>AI sends only what you choose.</h2>
        <p>
          When you request AI assistance, the selected text and chosen source
          passages are sent through our server to Groq. They are not stored in
          our application database or application logs. Groq processes requests
          under its own terms and data controls. Local document storage does not
          mean AI runs on your device.
        </p>
        <h2>Protecting the free allowance.</h2>
        <p>
          Cloudflare Turnstile verifies requests. A necessary anonymous cookie,
          expiring counters, and a daily hashed IP identifier help limit abuse.
          Counters are stored in Upstash and expire within about 25 hours.
          Hosting and infrastructure providers may process connection and
          security metadata under their own policies.
        </p>
        <h2>Use educational content only.</h2>
        <p>
          Do not enter patient names, contact details, identifiers, real patient
          reports, or other sensitive personal information. This app is for
          learning and teaching. Deleting a note moves it to local trash;
          permanent deletion removes its local snapshots too. Downloaded exports
          must be removed separately.
        </p>
        <p>
          Provider policies:{" "}
          <a href="https://console.groq.com/docs/your-data">Groq</a> ·{" "}
          <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare</a> ·{" "}
          <a href="https://upstash.com/trust/privacy.pdf">Upstash</a>.
        </p>
      </main>
      <Footer />
    </>
  );
}
