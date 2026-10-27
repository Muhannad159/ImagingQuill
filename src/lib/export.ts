import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { z } from "zod";
import {
  citationIds,
  paperSchema,
  reference,
  sanitizeNode,
  type Note,
  type RichNode,
} from "./model";
export function download(data: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function backup(note: Note) {
  return zipSync({
    "document.json": strToU8(JSON.stringify({ version: 1, note })),
  });
}
export function restore(bytes: Uint8Array): Note {
  if (bytes.length > 30000000) throw new Error("Backup exceeds 30 MB.");
  let total = 0;
  const files = unzipSync(bytes, {
    filter: (file) => {
      total += file.originalSize;
      if (total > 40000000) throw new Error("Expanded backup is too large.");
      return file.name === "document.json";
    },
  });
  if (!files["document.json"])
    throw new Error("This is not an ImagingQuill backup.");
  const schema = z.object({
    version: z.literal(1),
    note: z.object({
      title: z.string().max(300),
      tags: z.array(z.string().max(40)).max(20),
      favorite: z.boolean(),
      content: z.unknown(),
      papers: z.array(paperSchema).max(500),
      cards: z
        .array(
          z.object({
            id: z.string(),
            question: z.string().max(3000),
            answer: z.string().max(5000),
          }),
        )
        .max(500),
    }),
  });
  const { note } = schema.parse(JSON.parse(strFromU8(files["document.json"])));
  const content = sanitizeNode(note.content);
  if (content.type !== "doc") throw new Error("Invalid root.");
  if (citationIds(content).some((id) => !note.papers.some((p) => p.id === id)))
    throw new Error("Backup contains a missing reference.");
  return {
    ...note,
    content,
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
    revision: 0,
  };
}
export function markdown(note: Note) {
  const files: Record<string, Uint8Array> = {};
  const ids = citationIds(note.content);
  let imageCount = 0;
  function render(n: RichNode): string {
    if (n.type === "text") {
      let t = (n.text ?? "").replace(/([\\`*_[\]])/g, "\\$1");
      for (const m of n.marks ?? []) {
        if (m.type === "bold") t = `**${t}**`;
        if (m.type === "italic") t = `*${t}*`;
        if (m.type === "link") t = `[${t}](${m.attrs?.href})`;
      }
      return t;
    }
    if (n.type === "citation")
      return `[${ids.indexOf(String(n.attrs?.paperId)) + 1}]`;
    if (n.type === "image") {
      const src = String(n.attrs?.src ?? "");
      const match = src.match(/^data:image\/(png|jpeg|webp);base64,(.*)$/);
      if (!match) return "";
      const path = `images/image-${++imageCount}.${match[1]}`;
      files[path] = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
      return `\n![${String(n.attrs?.alt ?? "").replace(/[\[\]]/g, "")}](${path})\n${n.attrs?.caption ?? ""}\n${n.attrs?.source ?? ""}\n`;
    }
    const body = (n.content ?? []).map(render).join("");
    switch (n.type) {
      case "heading":
        return `${"#".repeat(Number(n.attrs?.level) || 2)} ${body}\n\n`;
      case "paragraph":
        return `${body}\n\n`;
      case "listItem":
        return `- ${body.trim()}\n`;
      case "taskItem":
        return `- [${n.attrs?.checked ? "x" : " "}] ${body.trim()}\n`;
      case "blockquote":
        return (
          body
            .split("\n")
            .map((l) => `> ${l}`)
            .join("\n") + "\n"
        );
      case "table": {
        const rows = n.content ?? [];
        if (!rows.length) return "";
        const header = render(rows[0]);
        const separator = `|${(rows[0].content ?? []).map(() => " --- |").join("")}\n`;
        return `\n${header}${separator}${rows.slice(1).map(render).join("")}\n`;
      }
      case "tableCell":
      case "tableHeader":
        return ` ${body.trim().replace(/\|/g, "\\|")} |`;
      case "tableRow":
        return `|${body}\n`;
      case "hardBreak":
        return "\n";
      case "horizontalRule":
        return "\n---\n";
      default:
        return body;
    }
  }
  const body = `# ${note.title}\n\n${render(note.content)}\n## References\n\n${ids.map((id, i) => `${i + 1}. ${reference(note.papers.find((p) => p.id === id)!)}`).join("\n")}`;
  files["note.md"] = strToU8(body);
  return zipSync(files);
}
