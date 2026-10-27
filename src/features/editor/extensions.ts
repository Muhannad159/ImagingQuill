import { Extension, Node, mergeAttributes } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { citationIds, type RichNode } from "@/lib/model";
export const Direction = Extension.create({
  name: "direction",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "blockquote"],
        attributes: {
          dir: {
            default: "auto",
            parseHTML: (el) => el.getAttribute("dir") ?? "auto",
            renderHTML: (a) => ({ dir: a.dir }),
          },
        },
      },
    ];
  },
});
export const Citation = Node.create({
  name: "citation",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return { paperId: { default: "" } };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-citation]",
        getAttrs: (el) => ({
          paperId: (el as HTMLElement).getAttribute("data-citation"),
        }),
      },
    ];
  },
  renderHTML({ node }) {
    return [
      "span",
      {
        "data-citation": node.attrs.paperId,
        class: "citation",
        contenteditable: "false",
      },
      `[${citationIds((this.editor?.getJSON() ?? { type: "doc" }) as RichNode).indexOf(node.attrs.paperId) + 1}]`,
    ];
  },
  addNodeView() {
    return ({ node, editor }) => {
      const dom = document.createElement("span");
      dom.className = "citation";
      dom.dataset.citation = node.attrs.paperId;
      dom.contentEditable = "false";
      const update = () => {
        dom.textContent = `[${citationIds(editor.getJSON() as RichNode).indexOf(node.attrs.paperId) + 1}]`;
      };
      queueMicrotask(update);
      editor.on("transaction", update);
      return {
        dom,
        destroy() {
          editor.off("transaction", update);
        },
      };
    };
  },
});
export const Figure = Image.extend({
  parseHTML() {
    return [
      {
        tag: "img[src]",
        getAttrs: (element) => {
          const src = (element as HTMLElement).getAttribute("src") ?? "";
          return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
            src,
          ) && src.length <= 7000000
            ? {}
            : false;
        },
      },
    ];
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: { default: "" },
      source: { default: "" },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const { caption, source, ...attrs } = HTMLAttributes;
    return [
      "figure",
      {},
      ["img", mergeAttributes(attrs, { loading: "lazy" })],
      [
        "figcaption",
        {},
        String(caption ?? ""),
        ...(source
          ? [
              [
                "a",
                { href: source, target: "_blank", rel: "noopener noreferrer" },
                " · Source",
              ],
            ]
          : []),
      ],
    ];
  },
}).configure({ allowBase64: true });
