"use client";
import { useRef, useState } from "react";
import { Search, ExternalLink, BookOpen } from "lucide-react";
import { paperUrl, type Paper, type SourceText } from "@/lib/model";
export default function LiteraturePanel({
  papers,
  onSave,
  onCite,
  onSource,
  selectedSources,
}: {
  papers: Paper[];
  onSave: (paper: Paper) => void;
  onCite: (paper: Paper) => void;
  onSource: (source: SourceText, ids: string[]) => void;
  selectedSources: { pmcid: string; passageIds: string[] }[];
}) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [oa, setOa] = useState(false);
  const [review, setReview] = useState(false);
  const [results, setResults] = useState<Paper[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<Paper | null>(null);
  const [source, setSource] = useState<SourceText | null>(null);
  const [passages, setPassages] = useState<string[]>([]);
  const controller = useRef<AbortController | null>(null);
  async function search(more = false) {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({
        q: query,
        year,
        oa: String(oa),
        review: String(review),
      });
      if (more && cursor) params.set("cursor", cursor);
      const r = await fetch(`/api/literature/search?${params}`, {
        signal: ctrl.signal,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setResults((old) =>
        more
          ? [
              ...old,
              ...data.papers.filter(
                (p: Paper) => !old.some((o) => o.id === p.id),
              ),
            ]
          : data.papers,
      );
      setTotal(data.total);
      setCursor(data.cursor);
    } catch (e) {
      if (!ctrl.signal.aborted)
        setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      if (!ctrl.signal.aborted) setBusy(false);
    }
  }
  async function loadSource(p: Paper) {
    setBusy(true);
    setError("");
    setSource(null);
    try {
      const r = await fetch(`/api/literature/fulltext?pmcid=${p.pmcid}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setSource(data);
      setPassages(
        selectedSources.find((s) => s.pmcid === p.pmcid)?.passageIds ?? [],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Article unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel-content">
      <div className="eyebrow">EVIDENCE WITHIN REACH</div>
      <h2>Find a starting point.</h2>
      <p className="muted">Search papers from Europe PMC.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <label className="search-box">
          <Search size={16} />
          <input
            aria-label="Search literature"
            placeholder="Topic, title, author, DOI…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            minLength={2}
            maxLength={300}
          />
        </label>
        <div className="filters">
          <input
            aria-label="Publication year"
            placeholder="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            pattern="[0-9]{4}"
            maxLength={4}
          />
          <label>
            <input
              type="checkbox"
              checked={oa}
              onChange={(e) => setOa(e.target.checked)}
            />{" "}
            Open access
          </label>
          <label>
            <input
              type="checkbox"
              checked={review}
              onChange={(e) => setReview(e.target.checked)}
            />{" "}
            Reviews
          </label>
        </div>
        <button
          className="button full"
          disabled={busy || query.trim().length < 2}
        >
          Search literature
        </button>
      </form>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {busy && <p role="status">Searching the literature…</p>}
      {source ? (
        <section className="source-reader">
          <button onClick={() => setSource(null)}>← Back to results</button>
          <h3>{source.paper.title}</h3>
          <a href={source.license} target="_blank" rel="noreferrer">
            Reuse licence
          </a>
          <p>
            Select up to four passages to send to AI. A summary will cover only
            these passages.
          </p>
          <div className="passage-selection-status">
            <b>{passages.length} of 4 selected</b>
            {passages.length > 0 && (
              <button className="text-link" onClick={() => setPassages([])}>
                Clear all
              </button>
            )}
          </div>
          {source.passages.map((p) => (
            <label className="passage" key={p.id}>
              <input
                type="checkbox"
                checked={passages.includes(p.id)}
                disabled={passages.length >= 4 && !passages.includes(p.id)}
                onChange={(e) =>
                  setPassages((old) =>
                    e.target.checked
                      ? [...old, p.id]
                      : old.filter((id) => id !== p.id),
                  )
                }
              />
              <span>
                <b>{p.section}</b>
                {p.text}
              </span>
            </label>
          ))}
          <button
            className="button full sticky-action"
            onClick={() => {
              onSource(source, passages);
              onSave(source.paper);
              setSource(null);
            }}
          >
            {passages.length
              ? `Use ${passages.length} selected ${passages.length === 1 ? "passage" : "passages"}`
              : "Save with no passages selected"}
          </button>
        </section>
      ) : (
        <>
          {total !== null && (
            <p className="result-count">
              {total.toLocaleString()} results
              {total === 0 ? " — try broader search terms." : ""}
            </p>
          )}
          {results.map((p) => (
            <article key={p.id} className="paper-result">
              <div className="row">
                <span className="eyebrow">{p.year || "UNDATED"}</span>
                {p.openAccess && <span className="badge">Open access</span>}
              </div>
              <button
                className="paper-title"
                onClick={() => setDetail(detail?.id === p.id ? null : p)}
              >
                {p.title}
              </button>
              <p>{p.authors}</p>
              <small>{p.journal}</small>
              {detail?.id === p.id && (
                <div className="abstract">
                  <p>{p.abstract || "No abstract available."}</p>
                  {p.doi && <small>DOI: {p.doi}</small>}
                  <a href={paperUrl(p)} target="_blank" rel="noreferrer">
                    Read original <ExternalLink size={12} />
                  </a>
                </div>
              )}
              <div className="paper-actions">
                <button onClick={() => onSave(p)}>
                  {papers.some((s) => s.id === p.id) ? "Saved" : "Save"}
                </button>
                <button onClick={() => onCite(p)}>Cite</button>
                {p.pmcid && (
                  <button onClick={() => void loadSource(p)}>
                    Source passages
                  </button>
                )}
              </div>
            </article>
          ))}
          {cursor && results.length < (total ?? 0) && (
            <button
              className="button secondary full"
              disabled={busy}
              onClick={() => void search(true)}
            >
              Load more
            </button>
          )}
          {total === null && (
            <div className="empty-panel">
              <BookOpen size={32} />
              <h3>Follow your curiosity.</h3>
              <p>Try “diffusion weighted MRI” or a question from your note.</p>
            </div>
          )}
          <h3 className="saved-heading">
            Saved to this note · {papers.length}
          </h3>
          {papers.map((p) => (
            <article className="saved-paper" key={p.id}>
              <a href={paperUrl(p)} target="_blank" rel="noreferrer">
                {p.title}
              </a>
              <button onClick={() => onCite(p)}>Cite</button>
            </article>
          ))}
        </>
      )}
    </div>
  );
}
