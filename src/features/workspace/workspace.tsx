"use client";
import { Modal } from "@/components/modal";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import type { Editor } from "@tiptap/react";
import {
  Plus,
  Search,
  Star,
  FileText,
  BookOpen,
  Sparkles,
  Download,
  PanelLeft,
  PanelRight,
  Feather,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Brand } from "@/components/header";
import NoteEditor from "@/features/editor/editor";
import LiteraturePanel from "./literature-panel";
import AIPanel from "./ai-panel";
import { db, saveNote } from "@/lib/storage";
import { templates, templateContent } from "@/lib/templates";
import { backup, restore, markdown, download } from "@/lib/export";
import {
  citationIds,
  paperUrl,
  reference,
  samePaper,
  textOf,
  walk,
  type Note,
  type Paper,
  type RichNode,
  type SourceText,
} from "@/lib/model";
export default function Workspace() {
  const params = useSearchParams();
  const notes = useLiveQuery(
    () => db.notes.orderBy("updatedAt").reverse().toArray(),
    [],
  );
  const [note, setNote] = useState<Note | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [trash, setTrash] = useState(false);
  const [panel, setPanel] = useState<"literature" | "ai" | "revision">(
    "literature",
  );
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);
  const [status, setStatus] = useState("Saved on this device");
  const [error, setError] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<
    { id: string; savedAt: number; note: Note }[]
  >([]);
  const [sources, setSources] = useState<
    { source: SourceText; passageIds: string[] }[]
  >([]);
  const updateSourceSelection = useCallback(
    (source: SourceText, passageIds: string[]) => {
      setSources((old) => {
        const index = old.findIndex(
          (entry) => entry.source.paper.pmcid === source.paper.pmcid,
        );
        if (index >= 0)
          return old.map((entry, current) =>
            current === index ? { source, passageIds } : entry,
          );
        return [...old.slice(-2), { source, passageIds }];
      });
    },
    [],
  );
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [editCards, setEditCards] = useState(false);
  const latest = useRef<Note | null>(null);
  const dirty = useRef(false);
  const expected = useRef(0);
  const saving = useRef<Promise<void>>(Promise.resolve());
  const blocked = useRef(false);
  const initialized = useRef(false);
  const importRef = useRef<HTMLInputElement>(null);
  const flush = useCallback(async () => {
    saving.current = saving.current.then(async () => {
      if (!dirty.current || !latest.current || blocked.current) return;
      const value = latest.current;
      dirty.current = false;
      try {
        const saved = await saveNote(value, expected.current);
        expected.current = saved.revision;
        if (latest.current?.id === saved.id) {
          latest.current = { ...latest.current, revision: saved.revision };
          setStatus(dirty.current ? "Saving…" : "Saved on this device");
        }
      } catch (e) {
        dirty.current = true;
        blocked.current = true;
        setStatus("Not saved");
        setError(
          e instanceof Error
            ? e.message
            : "Storage is unavailable. Export a backup now.",
        );
      }
    });
    await saving.current;
  }, []);
  function edit(update: Partial<Note>) {
    if (!latest.current) return;
    const next = { ...latest.current, ...update };
    latest.current = next;
    dirty.current = true;
    setNote(next);
    setStatus("Saving…");
  }
  async function openNote(next: Note) {
    await flush();
    if (dirty.current) {
      setError("Save or export your current work before switching notes.");
      return;
    }
    next = (await db.notes.get(next.id)) ?? next;
    latest.current = next;
    expected.current = next.revision;
    blocked.current = false;
    setNote(next);
    setLoadVersion((v) => v + 1);
    setEditor(null);
    setSources([]);
    setError("");
    setStatus("Saved on this device");
    setLeft(false);
    setCardIndex(0);
    setRevealed(false);
  }
  async function create(slug?: string) {
    await flush();
    if (dirty.current) return;
    const t = templates.find((t) => t.slug === slug);
    const next: Note = {
      id: crypto.randomUUID(),
      title: t?.heading ?? "Untitled note",
      tags: [],
      favorite: false,
      content: templateContent(slug),
      papers: [],
      cards: [],
      updatedAt: Date.now(),
      revision: 0,
    };
    try {
      await db.notes.put(next);
      await openNote(next);
      setNewOpen(false);
    } catch {
      setError(
        "Browser storage is unavailable. Enable storage to create notes.",
      );
    }
  }
  // Browser database initialization intentionally hydrates the first document once.
  useEffect(() => {
    if (!notes || initialized.current) return;
    initialized.current = true;
    const slug = params.get("template");
    if (slug && templates.some((t) => t.slug === slug)) {
      // Initialize the editor from the asynchronously opened local database.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void create(slug);
      window.history.replaceState({}, "", "/workspace");
    } else {
      const active = notes.find((n) => !n.deletedAt);
      if (active) void openNote(active);
    }
    // Initialize once after the browser database opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);
  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => void flush(), 600);
    return () => clearTimeout(timer);
  }, [note, flush]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    window.addEventListener("beforeunload", leave);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("beforeunload", leave);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [flush]);
  const onContent = useCallback((content: RichNode) => {
    if (!latest.current) return;
    const next = { ...latest.current, content };
    latest.current = next;
    dirty.current = true;
    setNote(next);
    setStatus("Saving…");
  }, []);
  const ready = useCallback((e: Editor) => setEditor(e), []);
  function savePaper(p: Paper) {
    const current = latest.current;
    if (!current) return;
    const existing = current.papers.find((x) => samePaper(x, p));
    if (!existing) edit({ papers: [...current.papers, p] });
    else if (p.license && p.license !== existing.license) {
      const updated = { ...existing, license: p.license, pmcid: existing.pmcid ?? p.pmcid };
      edit({ papers: current.papers.map(item => item.id === existing.id ? updated : item) });
      return updated;
    }
    return existing ?? p;
  }
  function cite(p: Paper) {
    const saved = savePaper(p);
    if (saved && editor)
      editor
        .chain()
        .focus()
        .insertContent({ type: "citation", attrs: { paperId: saved.id } })
        .run();
  }
  async function exportNote(kind: "backup" | "markdown") {
    if (!latest.current) return;
    try {
      const bytes =
        kind === "backup" ? backup(latest.current) : markdown(latest.current);
      download(
        new Uint8Array(bytes).buffer,
        `${latest.current.title.replace(/[^\p{L}\p{N} -]/gu, "").slice(0, 70) || "note"}.${kind === "backup" ? "imagingquill" : "markdown"}.zip`,
        "application/zip",
      );
    } catch {
      setError("Export failed. Please try again.");
    }
  }
  async function duplicate(n: Note) {
    await flush();
    if (dirty.current) return;
    n = (await db.notes.get(n.id)) ?? n;
    const copy = {
      ...n,
      id: crypto.randomUUID(),
      title: `${n.title} (copy)`,
      revision: 0,
      deletedAt: undefined,
      updatedAt: Date.now(),
    };
    await db.notes.put(copy);
    await openNote(copy);
  }
  async function remove(n: Note) {
    if (!window.confirm(`Move “${n.title}” to trash?`)) return;
    await flush();
    if (dirty.current) return;
    await db.notes
      .where("id")
      .equals(n.id)
      .modify((row) => {
        row.deletedAt = Date.now();
        row.revision += 1;
      });
    if (latest.current?.id === n.id) {
      latest.current = null;
      setNote(null);
      setEditor(null);
    }
  }
  const visible = (notes ?? []).filter(
    (n) =>
      Boolean(n.deletedAt) === trash &&
      (!favorites || n.favorite) &&
      `${n.title} ${n.tags.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const ids = note ? citationIds(note.content) : [];
  const outline: string[] = [];
  if (note)
    walk(note.content, (n) => {
      if (n.type === "heading") outline.push(textOf(n));
    });
  const words = note
    ? textOf(note.content).trim().split(/\s+/).filter(Boolean).length
    : 0;
  const card = note?.cards[cardIndex];
  return (
    <div className="workspace">
      <header className="workspace-header">
        <Brand />
        <span className="workspace-label">YOUR LEARNING WORKSPACE</span>
        <div className="row">
          <button
            className="icon-button mobile-left"
            aria-label="Toggle document library"
            onClick={() => setLeft(!left)}
          >
            <PanelLeft size={20} />
          </button>
          <button
            className="icon-button mobile-right"
            aria-label="Toggle research panel"
            onClick={() => setRight(!right)}
          >
            <PanelRight size={20} />
          </button>
          <a className="help-link" href="/sources" target="_blank">
            Learning use only ↗
          </a>
        </div>
      </header>
      <div className="workspace-grid">
        <aside className={`library ${left ? "mobile-open" : ""}`}>
          <div className="row between">
            <div className="eyebrow">YOUR LIBRARY</div>
            <span className="count">
              {notes?.filter((n) => !n.deletedAt).length ?? 0}
            </span>
          </div>
          <button className="button full" onClick={() => setNewOpen(true)}>
            <Plus size={17} /> New note
          </button>
          <label className="search-box">
            <Search size={15} />
            <input
              placeholder="Find a note…"
              aria-label="Search your notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="library-filters">
            <button
              className={!favorites && !trash ? "active" : ""}
              onClick={() => {
                setFavorites(false);
                setTrash(false);
              }}
            >
              All notes
            </button>
            <button
              className={favorites ? "active" : ""}
              onClick={() => {
                setFavorites(!favorites);
                setTrash(false);
              }}
              aria-label="Favorites"
            >
              <Star size={14} />
            </button>
            <button
              className={trash ? "active" : ""}
              onClick={() => {
                setTrash(!trash);
                setFavorites(false);
              }}
              aria-label="Trash"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="note-list">
            {visible.map((n) => (
              <div
                className={`note-item ${note?.id === n.id ? "active" : ""}`}
                key={n.id}
              >
                <button
                  className="note-open"
                  onClick={() => !trash && void openNote(n)}
                  disabled={trash}
                >
                  <FileText size={16} />
                  <div>
                    <strong>{n.title}</strong>
                    <span>
                      {new Date(n.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                      {n.tags.length ? ` · ${n.tags.join(", ")}` : ""}
                    </span>
                  </div>
                  {n.favorite && <Star size={12} />}
                </button>
                {trash ? (
                  <div className="note-actions">
                    <button
                      onClick={async () => {
                        await db.notes
                          .where("id")
                          .equals(n.id)
                          .modify((row) => {
                            delete row.deletedAt;
                            row.revision += 1;
                          });
                      }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={async () => {
                        if (
                          !window.confirm(
                            "Permanently delete this note and its snapshots?",
                          )
                        )
                          return;
                        await db.transaction(
                          "rw",
                          db.notes,
                          db.snapshots,
                          async () => {
                            await db.notes.delete(n.id);
                            await db.snapshots
                              .where("noteId")
                              .equals(n.id)
                              .delete();
                          },
                        );
                      }}
                    >
                      Delete forever
                    </button>
                  </div>
                ) : (
                  <div className="note-actions">
                    <button onClick={() => void duplicate(n)}>Duplicate</button>
                    <button onClick={() => void remove(n)}>Trash</button>
                  </div>
                )}
              </div>
            ))}
            {!visible.length && (
              <p className="muted">
                {query
                  ? "No notes match your search."
                  : trash
                    ? "Trash is empty."
                    : "Your next idea starts here."}
              </p>
            )}
          </div>
          <div className="library-bottom">
            <button
              className="text-link"
              onClick={() => importRef.current?.click()}
            >
              <Download size={14} /> Restore a backup
            </button>
            <input
              hidden
              ref={importRef}
              type="file"
              accept=".zip"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  await flush();
                  if (dirty.current) return;
                  const restored = restore(
                    new Uint8Array(await file.arrayBuffer()),
                  );
                  await db.notes.put(restored);
                  await openNote(restored);
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Could not restore backup.",
                  );
                }
              }}
            />
            <p>
              Saved in this browser.
              <br />
              Back up notes you want to keep.
            </p>
            <a href="/privacy">Privacy & local storage ↗</a>
          </div>
        </aside>
        <main className="writing-area">
          {error && (
            <div className="notice error" role="alert">
              {error}
              <button
                onClick={() => {
                  blocked.current = false;
                  void flush();
                }}
              >
                Retry saving
              </button>
              {status === "Not saved" && note && (
                <button
                  onClick={async () => {
                    if (
                      !window.confirm(
                        "Reload the saved version? Export a backup first if you want to keep your unsaved changes.",
                      )
                    )
                      return;
                    const saved = await db.notes.get(note.id);
                    if (saved) {
                      dirty.current = false;
                      blocked.current = false;
                      await openNote(saved);
                    }
                  }}
                >
                  Reload saved version
                </button>
              )}
            </div>
          )}
          {note ? (
            <>
              <div className="document-actions">
                <span role="status">
                  <span
                    className={`dot ${status === "Not saved" ? "unsaved" : ""}`}
                  />
                  {status}
                </span>
                <div className="row">
                  <button
                    title="Local history"
                    aria-label="Local history"
                    onClick={async () => {
                      await flush();
                      setSnapshots(
                        (
                          await db.snapshots
                            .where("noteId")
                            .equals(note.id)
                            .sortBy("savedAt")
                        ).reverse(),
                      );
                      setHistoryOpen(true);
                    }}
                  >
                    <RotateCcw size={15} />
                  </button>
                  <button onClick={() => void exportNote("backup")}>
                    Backup
                  </button>
                  <details className="export-menu">
                    <summary>Export ↓</summary>
                    <div>
                      <button onClick={() => void exportNote("markdown")}>
                        Markdown + images
                      </button>
                      <button onClick={() => window.print()}>
                        Print / Save as PDF
                      </button>
                    </div>
                  </details>
                </div>
              </div>
              <div className="document-heading">
                <div className="eyebrow">
                  LEARNING NOTE <span> / </span> YOUR OWN UNDERSTANDING
                </div>
                <h1 className="print-title" dir="auto">
                  {note.title}
                </h1>
                <div className="title-row">
                  <input
                    aria-label="Document title"
                    value={note.title}
                    maxLength={300}
                    onChange={(e) => edit({ title: e.target.value })}
                  />
                  <button
                    aria-label={
                      note.favorite ? "Remove favorite" : "Favorite note"
                    }
                    onClick={() => edit({ favorite: !note.favorite })}
                  >
                    <Star
                      size={20}
                      fill={note.favorite ? "currentColor" : "none"}
                    />
                  </button>
                </div>
                <label className="tags-label">
                  Tags
                  <input
                    aria-label="Document tags"
                    placeholder="MRI, journal club…"
                    value={note.tags.join(", ")}
                    onChange={(e) =>
                      edit({
                        tags: e.target.value
                          .split(",")
                          .slice(0, 20)
                          .map((t) => t.trimStart().slice(0, 40)),
                      })
                    }
                  />
                </label>
              </div>
              <NoteEditor
                key={`${note.id}:${loadVersion}`}
                note={note}
                onChange={onContent}
                onReady={ready}
              />
              {ids.length > 0 && (
                <section className="bibliography">
                  <h2>References</h2>
                  <ol>
                    {ids.map((id) => {
                      const p = note.papers.find((p) => p.id === id);
                      return (
                        <li key={id}>
                          {p ? (
                            <>
                              <span>{reference(p)}</span>{" "}
                              <a
                                href={paperUrl(p)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Source ↗
                              </a>
                            </>
                          ) : (
                            <span>
                              Missing reference — restore it from your backup.
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}
              <div className="editor-footer">
                <span>
                  {words} words · {note.papers.length} saved references
                </span>
                <span>English & العربية</span>
              </div>
            </>
          ) : (
            <div className="workspace-empty">
              <span className="empty-mark">
                <Feather size={36} />
              </span>
              <div className="eyebrow">A QUIET SPACE FOR YOUR NEXT IDEA</div>
              <h1>
                What will you
                <br />
                <em>understand today?</em>
              </h1>
              <p>
                Make a note, bring in the literature,
                <br />
                and connect the ideas in your own words.
              </p>
              <button className="button" onClick={() => void create()}>
                Start a blank note <Plus size={17} />
              </button>
              <div className="starter-options">
                {templates.map((t) => (
                  <button key={t.slug} onClick={() => void create(t.slug)}>
                    <FileText size={18} />
                    <span>
                      {t.title}
                      <small>{t.category.toLowerCase()}</small>
                    </span>
                    <span>↗</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
        <aside className={`research-panel ${right ? "mobile-open" : ""}`}>
          <div className="panel-tabs">
            <button
              className={panel === "literature" ? "active" : ""}
              onClick={() => setPanel("literature")}
            >
              <BookOpen size={16} /> Literature
            </button>
            <button
              className={panel === "ai" ? "active" : ""}
              onClick={() => setPanel("ai")}
            >
              <Sparkles size={16} /> AI
            </button>
            <button
              className={panel === "revision" ? "active" : ""}
              onClick={() => setPanel("revision")}
            >
              Revision
            </button>
          </div>
          {note ? (
            <>
              <div
                className="panel-view"
                hidden={panel !== "literature"}
              >
              <LiteraturePanel
                key={note.id}
                papers={note.papers}
                onSave={savePaper}
                onCite={cite}
                selectedSources={sources.map((s) => ({
                  pmcid: s.source.paper.pmcid!,
                  passageIds: s.passageIds,
                }))}
                onSource={updateSourceSelection}
              />
              </div>
              <div className="panel-view" hidden={panel !== "ai"}>
              <AIPanel
                key={note.id}
                editor={editor}
                note={note}
                sources={sources}
                onCards={(cards) => {
                  edit({ cards: [...note.cards, ...cards] });
                  setPanel("revision");
                }}
                onInsertSource={() => setPanel("literature")}
                onSourceChange={updateSourceSelection}
              />
              </div>
              <div className="panel-view" hidden={panel !== "revision"}>
              <div className="panel-content">
                <div className="eyebrow">MAKE IT STICK</div>
                <h2>Return to the ideas.</h2>
                <h3>Document outline</h3>
                {outline.length ? (
                  <ol className="outline">
                    {outline.map((t, i) => (
                      <li key={i}>
                        <button
                          onClick={() => {
                            const el =
                              editor?.view.dom.querySelectorAll("h1,h2,h3")[i];
                            el?.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }}
                        >
                          {t}
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted">Add headings to build an outline.</p>
                )}
                <div className="row between">
                  <h3>Revision cards · {note.cards.length}</h3>
                  {note.cards.length > 0 && (
                    <button onClick={() => setEditCards(!editCards)}>
                      {editCards ? "Review" : "Edit"}
                    </button>
                  )}
                </div>
                {editCards ? (
                  note.cards.map((c) => (
                    <div className="editable-card" key={c.id}>
                      <label>
                        Question
                        <textarea
                          value={c.question}
                          onChange={(e) =>
                            edit({
                              cards: note.cards.map((x) =>
                                x.id === c.id
                                  ? { ...x, question: e.target.value }
                                  : x,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        Answer
                        <textarea
                          value={c.answer}
                          onChange={(e) =>
                            edit({
                              cards: note.cards.map((x) =>
                                x.id === c.id
                                  ? { ...x, answer: e.target.value }
                                  : x,
                              ),
                            })
                          }
                        />
                      </label>
                      <button
                        onClick={() => {
                          edit({
                            cards: note.cards.filter((x) => x.id !== c.id),
                          });
                          setCardIndex(0);
                        }}
                      >
                        Delete card
                      </button>
                    </div>
                  ))
                ) : card ? (
                  <div className="review-card">
                    <span className="eyebrow">
                      {cardIndex + 1} / {note.cards.length}
                    </span>
                    <h3 dir="auto">{card.question}</h3>
                    {revealed ? (
                      <p dir="auto">{card.answer}</p>
                    ) : (
                      <button
                        className="button secondary"
                        onClick={() => setRevealed(true)}
                      >
                        Reveal answer
                      </button>
                    )}
                    <button
                      className="text-link"
                      onClick={() => {
                        setCardIndex((cardIndex + 1) % note.cards.length);
                        setRevealed(false);
                      }}
                    >
                      Next card →
                    </button>
                  </div>
                ) : (
                  <p className="muted">
                    Select part of your note, then use AI to create editable
                    flashcards or revision questions.
                  </p>
                )}
              </div>
              </div>
            </>
          ) : (
            <div className="empty-panel">
              <BookOpen size={32} />
              <h3>A little context goes a long way.</h3>
              <p>
                Open a note to explore literature and keep your references
                close.
              </p>
            </div>
          )}
        </aside>
      </div>
      {newOpen && (
        <Modal label="Create a note" onClose={() => setNewOpen(false)}>
          <h2>Choose your starting point.</h2>
          <button className="button full" onClick={() => void create()}>
            Blank note
          </button>
          {templates.map((t) => (
            <button
              className="template-option"
              key={t.slug}
              onClick={() => void create(t.slug)}
            >
              <b>{t.title}</b>
              <span>{t.description}</span>
            </button>
          ))}
          <button onClick={() => setNewOpen(false)}>Cancel</button>
        </Modal>
      )}
      {historyOpen && (
        <Modal label="Local history" onClose={() => setHistoryOpen(false)}>
          <h2>Local snapshots</h2>
          <p>
            Up to ten recent snapshots, saved at most once per minute while
            editing.
          </p>
          {snapshots.length ? (
            snapshots.map((s) => (
              <div className="row between" key={s.id}>
                <span>{new Date(s.savedAt).toLocaleString()}</span>
                <button
                  onClick={() => {
                    edit({
                      content: s.note.content,
                      title: s.note.title,
                      papers: s.note.papers,
                      cards: s.note.cards,
                      tags: s.note.tags,
                    });
                    editor?.commands.setContent(s.note.content);
                    setHistoryOpen(false);
                  }}
                >
                  Restore
                </button>
              </div>
            ))
          ) : (
            <p>No earlier snapshots yet.</p>
          )}
          <button onClick={() => setHistoryOpen(false)}>Close</button>
        </Modal>
      )}
    </div>
  );
}
