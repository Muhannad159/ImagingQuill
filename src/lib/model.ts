import { z } from "zod";
export type RichNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: RichNode[];
};
export const paperSchema = z.object({
  id: z.string().max(150),
  source: z.string().regex(/^[A-Z]+$/),
  externalId: z.string().regex(/^[a-zA-Z0-9]+$/),
  title: z.string().max(5000),
  authors: z.string().max(5000),
  journal: z.string().max(1000),
  year: z.string().max(4),
  doi: z.string().max(300).optional(),
  pmcid: z
    .string()
    .regex(/^PMC\d+$/)
    .optional(),
  abstract: z.string().max(100000).optional(),
  openAccess: z.boolean(),
  license: z.string().max(300).optional(),
});
export type Paper = z.infer<typeof paperSchema>;
export type Passage = { id: string; text: string; section: string };
export type SourceText = { paper: Paper; license: string; passages: Passage[] };
export type Card = { id: string; question: string; answer: string };
export type Note = {
  id: string;
  title: string;
  tags: string[];
  favorite: boolean;
  content: RichNode;
  papers: Paper[];
  cards: Card[];
  updatedAt: number;
  revision: number;
  deletedAt?: number;
};
export const actions = [
  "simplify",
  "shorten",
  "restructure",
  "translate",
  "explain",
  "summary",
  "flashcards",
  "questions",
] as const;
export type Action = (typeof actions)[number];
export const proposalSchema = z
  .object({
    text: z.string().max(20000),
    citations: z.array(z.string()).max(20),
    cards: z
      .array(
        z.object({
          question: z.string().max(3000),
          answer: z.string().max(5000),
        }),
      )
      .max(10),
  })
  .strict();
export type Proposal = z.infer<typeof proposalSchema>;
export function walk(node: RichNode, fn: (node: RichNode) => void) {
  fn(node);
  node.content?.forEach((n) => walk(n, fn));
}
export function textOf(node: RichNode): string {
  if (node.text) return node.text;
  return (node.content ?? [])
    .map(textOf)
    .join(
      ["doc", "bulletList", "orderedList", "table", "tableRow"].includes(
        node.type,
      )
        ? "\n"
        : "",
    );
}
export function citationIds(node: RichNode) {
  const ids: string[] = [];
  walk(node, (n) => {
    if (
      n.type === "citation" &&
      typeof n.attrs?.paperId === "string" &&
      !ids.includes(n.attrs.paperId)
    )
      ids.push(n.attrs.paperId);
  });
  return ids;
}
export function samePaper(a: Paper, b: Paper) {
  return (
    a.id === b.id ||
    Boolean(a.doi && b.doi && a.doi.toLowerCase() === b.doi.toLowerCase())
  );
}
export function reference(p: Paper) {
  return `${p.authors || "Unknown author"}. ${p.title}. ${p.journal}${p.year ? `; ${p.year}` : ""}.${p.doi ? ` doi: ${p.doi}` : ""}`;
}
export function paperUrl(p: Paper) {
  return `https://europepmc.org/article/${encodeURIComponent(p.source)}/${encodeURIComponent(p.externalId)}`;
}
const types = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "blockquote",
  "hardBreak",
  "horizontalRule",
  "codeBlock",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
  "image",
  "citation",
]);
export function safeUrl(value: unknown) {
  return typeof value === "string" && /^https?:\/\//i.test(value) ? value : "";
}
export function sanitizeNode(input: unknown, depth = 0): RichNode {
  if (depth > 30 || !input || typeof input !== "object")
    throw new Error("Invalid document structure.");
  const n = input as RichNode;
  if (!types.has(n.type)) throw new Error("Unsupported document content.");
  const out: RichNode = { type: n.type };
  if (n.text !== undefined) {
    if (typeof n.text !== "string") throw new Error("Invalid text.");
    out.text = n.text;
  }
  if (n.content) {
    if (!Array.isArray(n.content) || n.content.length > 10000)
      throw new Error("Document is too large.");
    out.content = n.content.map((c) => sanitizeNode(c, depth + 1));
  }
  if (n.attrs) {
    const a = n.attrs;
    out.attrs = {};
    if (a.dir === "rtl" || a.dir === "ltr" || a.dir === "auto")
      out.attrs.dir = a.dir;
    if (n.type === "heading")
      out.attrs.level = Math.min(3, Math.max(1, Number(a.level) || 2));
    if (n.type === "citation") {
      if (typeof a.paperId !== "string") throw new Error("Invalid citation.");
      out.attrs.paperId = a.paperId.slice(0, 150);
    }
    if (n.type === "taskItem") out.attrs.checked = Boolean(a.checked);
    if (["tableCell", "tableHeader"].includes(n.type)) {
      out.attrs.colspan = Math.min(20, Math.max(1, Number(a.colspan) || 1));
      out.attrs.rowspan = Math.min(20, Math.max(1, Number(a.rowspan) || 1));
    }
    if (n.type === "image") {
      if (
        typeof a.src !== "string" ||
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a.src) ||
        a.src.length > 7000000
      )
        throw new Error(
          "Only embedded PNG, JPEG and WebP images are supported.",
        );
      out.attrs.src = a.src;
      for (const k of ["alt", "title", "caption"])
        out.attrs[k] =
          typeof a[k] === "string" ? (a[k] as string).slice(0, 1000) : "";
      out.attrs.source = safeUrl(a.source);
    }
  }
  if (n.marks)
    out.marks = n.marks
      .filter((m) =>
        ["bold", "italic", "strike", "code", "underline", "link"].includes(
          m.type,
        ),
      )
      .map((m) =>
        m.type === "link"
          ? {
              type: "link",
              attrs: {
                href: safeUrl(m.attrs?.href),
                target: "_blank",
                rel: "noopener noreferrer",
              },
            }
          : { type: m.type },
      );
  return out;
}
export function paragraphs(text: string): RichNode[] {
  return text
    .split(/\n+/)
    .filter(Boolean)
    .map((text) => ({ type: "paragraph", content: [{ type: "text", text }] }));
}
export function validProposal(proposal: unknown, allowed: string[]) {
  const result = proposalSchema.parse(proposal);
  if (result.citations.some((id) => !allowed.includes(id)))
    throw new Error("The AI returned an unknown reference. Please retry.");
  return result;
}
