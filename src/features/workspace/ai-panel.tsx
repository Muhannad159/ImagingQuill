"use client";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Turnstile } from "@/components/turnstile";
import {
  AI_REQUEST_LIMIT,
  aiRequestSize,
  aiUserMessage,
} from "@/lib/ai-request";
import {
  paragraphs,
  samePaper,
  paperUrl,
  type Action,
  type Card,
  type Note,
  type Proposal,
  type RichNode,
  type SourceText,
} from "@/lib/model";
const labels: Record<Action, string> = {
  simplify: "Simplify",
  shorten: "Shorten",
  restructure: "Restructure",
  translate: "Translate",
  explain: "Explain with sources",
  summary: "Summarize passages",
  flashcards: "Create flashcards",
  questions: "Revision questions",
};
export default function AIPanel({
  editor,
  note,
  sources,
  onCards,
  onInsertSource,
  onSourceChange,
}: {
  editor: Editor | null;
  note: Note;
  sources: { source: SourceText; passageIds: string[] }[];
  onCards: (cards: Card[]) => void;
  onInsertSource: () => void;
  onSourceChange: (source: SourceText, passageIds: string[]) => void;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [action, setAction] = useState<Action>("simplify");
  const [language, setLanguage] = useState<"English" | "Arabic">("English");
  const [token, setToken] = useState("");
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);
  const [selection, setSelection] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [original, setOriginal] = useState("");
  const [copied, setCopied] = useState(false);
  const proposalRef = useRef<HTMLElement>(null);
  const requiresEvidence = action === "explain" || action === "summary";
  const selectedSources = requiresEvidence
    ? sources.filter((source) => source.passageIds.length)
    : [];
  const selectedPassageCount = selectedSources.reduce(
    (total, source) => total + source.passageIds.length,
    0,
  );
  const sourceContexts = selectedSources.map(({ source, passageIds }) => ({
    id: source.paper.id,
    title: source.paper.title,
    passages: source.passages.filter((passage) =>
      passageIds.includes(passage.id),
    ),
  }));
  const requestSize = aiRequestSize(
    aiUserMessage(action, language, selection, sourceContexts),
  );
  const requestTooLarge = requestSize > AI_REQUEST_LIMIT;
  const showProposal = () => {
    proposalRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  };
  useEffect(() => {
    if (!proposal) return;
    const frame = requestAnimationFrame(showProposal);
    return () => cancelAnimationFrame(frame);
  }, [proposal]);
  const capture = useRef<{
    json: string;
    from: number;
    to: number;
    citations: RichNode[];
  } | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    fetch("/api/ai/status")
      .then((r) => r.json())
      .then((d) => setAvailable(d.available))
      .catch(() => setAvailable(false));
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { from, to } = editor.state.selection;
      setSelection(editor.state.doc.textBetween(from, to, "\n"));
    };
    update();
    editor.on("selectionUpdate", update);
    editor.on("update", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("update", update);
    };
  }, [editor]);
  async function generate() {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, "\n");
    let hasImage = false;
    const citations: RichNode[] = [];
    editor.state.doc.nodesBetween(from, to, (node) => {
      if (node.type.name === "image") hasImage = true;
      if (node.type.name === "citation")
        citations.push(node.toJSON() as RichNode);
    });
    if (hasImage) {
      setError("Select text without images for this writing action.");
      return;
    }
    const liveUserMessage = aiUserMessage(
      action,
      language,
      text,
      sourceContexts,
    );
    if (aiRequestSize(liveUserMessage) > AI_REQUEST_LIMIT) {
      setError(
        "This request is too large. Uncheck one or more source passages, or shorten the selected editor text.",
      );
      return;
    }
    capture.current = {
      json: JSON.stringify(editor.getJSON()),
      from,
      to,
      citations,
    };
    setOriginal(text);
    setCopied(false);
    setProposal(null);
    setError("");
    setBusy(true);
    const ctrl = new AbortController();
    controller.current = ctrl;
    try {
      const r = await fetch("/api/ai/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text,
          revision: note.revision,
          language,
          token,
          sources: selectedSources.map((s) => ({
            pmcid: s.source.paper.pmcid,
            passageIds: s.passageIds,
          })),
        }),
        signal: ctrl.signal,
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setProposal(d.proposal);
    } catch (e) {
      if (!ctrl.signal.aborted)
        setError(e instanceof Error ? e.message : "AI request failed.");
    } finally {
      setBusy(false);
      setToken("");
      setNonce((n) => n + 1);
    }
  }
  function accept() {
    if (!editor || !proposal || !capture.current) return;
    const saved = capture.current;
    const selected = editor.state.selection;
    if (
      saved.json !== JSON.stringify(editor.getJSON()) ||
      selected.from !== saved.from ||
      selected.to !== saved.to
    ) {
      setError(
        "Your document or selection changed. Discard this proposal and generate a fresh one.",
      );
      return;
    }
    if (proposal.cards.length)
      onCards(proposal.cards.map((c) => ({ ...c, id: crypto.randomUUID() })));
    else {
      const nodes = paragraphs(proposal.text);
      const ids = [
        ...new Set([
          ...saved.citations.map((c) => String(c.attrs?.paperId)),
          ...proposal.citations.map((id) => {
            const source = sources.find((s) => s.source.paper.id === id);
            return source
              ? (note.papers.find((p) => samePaper(p, source.source.paper))
                  ?.id ?? id)
              : id;
          }),
        ]),
      ];
      if (ids.length) {
        if (!nodes.length) nodes.push({ type: "paragraph", content: [] });
        nodes[nodes.length - 1].content ??= [];
        nodes[nodes.length - 1].content!.push(
          ...ids.map((paperId) => ({ type: "citation", attrs: { paperId } })),
        );
      }
      editor
        .chain()
        .focus()
        .insertContentAt({ from: saved.from, to: saved.to }, nodes)
        .run();
    }
    setProposal(null);
    setError("");
  }
  return (
    <div className="panel-content">
      <div className="eyebrow">
        <Sparkles size={13} /> A SECOND PAIR OF EYES
      </div>
      <h2>Your words, a little clearer.</h2>
      <p className="muted">
        Select text in your note. Choose an action. Review before applying.
      </p>
      {available === false && (
        <div className="notice">
          AI is awaiting service configuration. Writing, literature search and
          exports are available.
        </div>
      )}
      <div className="ai-actions">
        {Object.entries(labels).map(([key, label]) => (
          <button
            className={action === key ? "selected" : ""}
            onClick={() => {
              setAction(key as Action);
              setProposal(null);
            }}
            key={key}
          >
            {label}
            <ArrowRight size={13} />
          </button>
        ))}
      </div>
      <label>
        Output language
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as "English" | "Arabic")}
        >
          <option>English</option>
          <option>Arabic</option>
        </select>
      </label>
      <div className="selection-preview">
        <div className="eyebrow">TEXT TO SEND</div>
        <p dir="auto">
          {selection || "Select a passage in the editor to begin."}
        </p>
      </div>
      {requiresEvidence && (
        <div className="source-selection">
          <div className="source-selection-heading">
            <b>
              Selected evidence · {selectedPassageCount}{" "}
              {selectedPassageCount === 1 ? "passage" : "passages"}
            </b>
            {selectedPassageCount > 0 && (
              <button
                className="text-link"
                disabled={busy}
                onClick={() => {
                  sources.forEach(({ source }) => onSourceChange(source, []));
                  setProposal(null);
                  setError("");
                }}
              >
                Clear all
              </button>
            )}
          </div>
          {selectedSources.length === 0 && (
            <p className="muted">No source passages selected.</p>
          )}
          {selectedSources.map((s) => (
            <article className="evidence-source" key={s.source.paper.id}>
              <div className="evidence-source-heading">
                <span>{s.source.paper.title}</span>
                <small>
                  {s.passageIds.length}{" "}
                  {s.passageIds.length === 1 ? "passage" : "passages"}
                </small>
              </div>
              <p className="muted evidence-help">
                Uncheck any passage you do not want to send.
              </p>
              <div className="evidence-passages">
                {s.source.passages
                  .filter((passage) => s.passageIds.includes(passage.id))
                  .map((passage) => (
                    <label
                      className="passage evidence-passage"
                      key={passage.id}
                    >
                      <input
                        type="checkbox"
                        checked
                        disabled={busy}
                        onChange={() => {
                          onSourceChange(
                            s.source,
                            s.passageIds.filter((id) => id !== passage.id),
                          );
                          setProposal(null);
                          setError("");
                        }}
                      />
                      <span>
                        <b>{passage.section}</b>
                        {passage.text}
                      </span>
                    </label>
                  ))}
              </div>
              <a
                href={paperUrl(s.source.paper)}
                target="_blank"
                rel="noreferrer"
              >
                Read original ↗
              </a>
            </article>
          ))}
          <button className="text-link" onClick={onInsertSource}>
            Choose source passages →
          </button>
        </div>
      )}
      {requestTooLarge && (
        <p className="notice error" role="alert">
          This request is too large. {requiresEvidence
            ? "Uncheck source passages above or select less text in the editor."
            : "Select less text in the editor."}
        </p>
      )}
      {requiresEvidence && selectedPassageCount === 0 && (
        <p className="notice">
          This action needs at least one checked source passage.
        </p>
      )}
      <label className="consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          Send selected text and passages for AI processing. No patient
          information is included.
        </span>
      </label>
      <div className="proposal-status" role="status" aria-live="polite">
        {busy ? (
          <span><Sparkles size={15} /> Generating your suggestion…</span>
        ) : proposal ? (
          <button className="text-link" onClick={showProposal}>
            <Sparkles size={15} /> Your result is ready — view below ↓
          </button>
        ) : null}
      </div>
      {available && <Turnstile nonce={nonce} onToken={setToken} />}
      <button
        className="button full"
        disabled={
          !available ||
          !consent ||
          !token ||
          busy ||
          requestTooLarge ||
          (requiresEvidence && selectedPassageCount === 0) ||
          (!selection && selectedPassageCount === 0)
        }
        onClick={() => void generate()}
      >
        <Sparkles size={15} />
        {busy ? "Preparing your proposal…" : "Generate proposal"}
      </button>
      {busy && (
        <button
          className="text-link"
          onClick={() => {
            controller.current?.abort();
            setBusy(false);
          }}
        >
          Cancel request
        </button>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {proposal && (
        <section className="proposal" ref={proposalRef} aria-labelledby="ai-proposal-title">
          <div className="eyebrow"><Sparkles size={14} /> GENERATED WITH AI · REVIEW BEFORE APPLYING</div>
          <h3 id="ai-proposal-title">
            {proposal.cards.length ? "Your revision cards" : "Your generated suggestion"}
          </h3>
          {original && (
            <details>
              <summary>Original selection</summary>
              <p dir="auto">{original}</p>
            </details>
          )}
          <div className="proposal-text" dir="auto">
            {proposal.text}
          </div>
          {proposal.cards.map((c, i) => (
            <div className="card-preview" key={i}>
              <b>{c.question}</b>
              <p>{c.answer}</p>
            </div>
          ))}
          {proposal.citations.length > 0 && (
            <p className="muted">Source IDs: {proposal.citations.join(", ")}</p>
          )}
          <p className="muted">
            Verify wording and evidence. A citation does not guarantee accuracy.
          </p>
          <div className="row wrap">
            <button className="button small" onClick={accept}>
              Accept
            </button>
            <button onClick={() => setProposal(null)}>Reject</button>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    proposal.text ||
                      proposal.cards
                        .map((c) => `${c.question}\n${c.answer}`)
                        .join("\n\n"),
                  );
                  setCopied(true);
                } catch {
                  setError(
                    "Clipboard access was blocked. Select the proposal text to copy it.",
                  );
                }
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
