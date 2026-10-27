import { paragraphs, type RichNode } from "./model";
export const templates = [
  {
    slug: "imaging-technique",
    title: "Imaging technique explainer",
    category: "UNDERSTAND",
    description: "Turn a complex technique into a clear explanation.",
    heading: "Understanding diffusion-weighted MRI",
    sections: [
      "Learning objective",
      "Core principle",
      "How the sequence works",
      "Interpreting the signal",
      "Pitfalls and limitations",
      "Key takeaways",
    ],
    intro:
      "Learning note: explore how diffusion weighting changes MRI signal. Use the literature panel to find and cite evidence before developing this explanation.",
  },
  {
    slug: "journal-club",
    title: "Journal club review",
    category: "APPRAISE",
    description: "Read critically. Make the evidence easier to discuss.",
    heading: "Journal club: evaluating a radiology paper",
    sections: [
      "Research question",
      "Study design and population",
      "Methods and outcome measures",
      "Main findings",
      "Limitations and potential bias",
      "Discussion questions",
    ],
    intro:
      "Start by choosing a paper and inserting its citation. Distinguish what the authors report from your own interpretation.",
  },
  {
    slug: "teaching-case",
    title: "Fictional teaching case",
    category: "TEACH",
    description: "Build a structured, explicitly fictional teaching exercise.",
    heading: "A fictional radiology teaching case",
    sections: [
      "Learning objectives",
      "Fictional scenario",
      "Illustrative findings",
      "Discussion",
      "Learning points",
    ],
    intro:
      "FICTIONAL EDUCATIONAL EXERCISE — not a patient record. Add only invented details and images you have permission to use.",
  },
  {
    slug: "topic-revision",
    title: "Topic revision note",
    category: "REMEMBER",
    description: "Organize the essentials and turn them into revision cards.",
    heading: "My radiology revision note",
    sections: [
      "What I want to understand",
      "Core concepts",
      "Common confusions",
      "Questions to revisit",
      "Sources",
    ],
    intro:
      "Write your understanding in your own words. Select a passage to create editable flashcards or revision questions.",
  },
];
export function templateContent(slug?: string): RichNode {
  const t = templates.find((t) => t.slug === slug);
  return {
    type: "doc",
    content: t
      ? [
          ...paragraphs(t.intro),
          ...t.sections.flatMap((text) => [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text }],
            },
            { type: "paragraph" },
          ]),
        ]
      : [{ type: "paragraph" }],
  };
}
