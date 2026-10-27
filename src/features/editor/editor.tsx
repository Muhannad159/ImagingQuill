"use client";
import { Modal } from "@/components/modal";
import { useEffect, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { Direction, Citation, Figure } from "./extensions";
import { citationIds, type Note, type RichNode } from "@/lib/model";
export default function NoteEditor({
  note,
  onChange,
  onReady,
}: {
  note: Note;
  onChange: (content: RichNode) => void;
  onReady: (editor: Editor) => void;
}) {
  const [imageOpen, setImageOpen] = useState(false);
  const [error, setError] = useState("");
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, protocols: ["http", "https"] },
      }),
      TableKit.configure({ table: { resizable: false } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: "Begin with a question. Make room for an idea…",
      }),
      Direction,
      Citation,
      Figure,
    ],
    content: note.content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose-editor",
        "aria-label": "Document editor",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichNode),
    onCreate: ({ editor }) => onReady(editor),
  });
  useEffect(() => {
    if (!editor) return;
    const number = () => {
      const ids = citationIds(editor.getJSON() as RichNode);
      editor.view.dom
        .querySelectorAll<HTMLElement>("[data-citation]")
        .forEach((el) => {
          el.textContent = `[${ids.indexOf(el.dataset.citation!) + 1}]`;
        });
    };
    number();
    editor.on("update", number);
    return () => {
      editor.off("update", number);
    };
  }, [editor]);
  if (!editor) return <div className="loading">Loading editor…</div>;
  const tool = (label: string, run: () => void, active = false) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={run}
    >
      {label}
    </button>
  );
  return (
    <>
      <div className="editor-toolbar" aria-label="Formatting controls">
        {tool(
          "Bold",
          () => editor.chain().focus().toggleBold().run(),
          editor.isActive("bold"),
        )}
        {tool(
          "Italic",
          () => editor.chain().focus().toggleItalic().run(),
          editor.isActive("italic"),
        )}
        <span className="divider" />
        {tool("H2", () =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
        )}
        {tool("H3", () =>
          editor.chain().focus().toggleHeading({ level: 3 }).run(),
        )}
        {tool("List", () => editor.chain().focus().toggleBulletList().run())}
        {tool("1. List", () =>
          editor.chain().focus().toggleOrderedList().run(),
        )}
        {tool("Checklist", () => editor.chain().focus().toggleTaskList().run())}
        {tool("Quote", () => editor.chain().focus().toggleBlockquote().run())}
        {tool("Table", () =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run(),
        )}
        {editor.isActive("table") && (
          <>
            {tool("+ Row", () => editor.chain().focus().addRowAfter().run())}
            {tool("+ Column", () =>
              editor.chain().focus().addColumnAfter().run(),
            )}
            {tool("Delete table", () =>
              editor.chain().focus().deleteTable().run(),
            )}
          </>
        )}
        {tool("Link", () => {
          const href = window.prompt("Website URL (https://)");
          if (href && /^https?:\/\//.test(href))
            editor.chain().focus().setLink({ href }).run();
        })}
        {tool("Image", () => setImageOpen(true))}
        <span className="divider" />
        {tool("LTR", () =>
          editor
            .chain()
            .focus()
            .updateAttributes("paragraph", { dir: "ltr" })
            .updateAttributes("heading", { dir: "ltr" })
            .run(),
        )}
        {tool("RTL", () =>
          editor
            .chain()
            .focus()
            .updateAttributes("paragraph", { dir: "rtl" })
            .updateAttributes("heading", { dir: "rtl" })
            .run(),
        )}
        {tool("Undo", () => editor.chain().focus().undo().run())}
        {tool("Redo", () => editor.chain().focus().redo().run())}
      </div>
      <EditorContent editor={editor} />
      {imageOpen && (
        <Modal label="Insert an image" onClose={() => setImageOpen(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const file = data.get("image") as File;
              if (
                !file ||
                !["image/png", "image/jpeg", "image/webp"].includes(
                  file.type,
                ) ||
                file.size > 4000000
              ) {
                setError("Choose a PNG, JPEG or WebP image smaller than 4 MB.");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "image",
                    attrs: {
                      src: reader.result,
                      alt: String(data.get("alt") ?? ""),
                      caption: String(data.get("caption") ?? ""),
                      source: String(data.get("source") ?? ""),
                    },
                  })
                  .run();
                setImageOpen(false);
              };
              reader.readAsDataURL(file);
            }}
          >
            <h2>Add an educational image</h2>
            <p>
              Use images you own or have permission to reuse. No patient
              information.
            </p>
            <label>
              Image
              <input
                name="image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
              />
            </label>
            <label>
              Alternative text
              <input name="alt" required maxLength={1000} />
            </label>
            <label>
              Caption
              <input name="caption" maxLength={1000} />
            </label>
            <label>
              Source URL
              <input name="source" type="url" pattern="https?://.*" />
            </label>
            {error && <p role="alert">{error}</p>}
            <div className="row">
              <button className="button" type="submit">
                Insert image
              </button>
              <button type="button" onClick={() => setImageOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
