import "server-only";
import { XMLParser } from "fast-xml-parser";
import type { Paper, SourceText } from "./model";
const base = "https://www.ebi.ac.uk/europepmc/webservices/rest";
export const plain = (v: unknown) =>
  String(v ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
export async function epmc(path: string) {
  const response = await fetch(`${base}/${path}`, {
    next: { revalidate: 21600 },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      "Literature service is temporarily unavailable. Please retry.",
    );
  return response;
}
export function normalize(p: Record<string, unknown>): Paper {
  return {
    id: `${p.source}:${p.id}`,
    source: String(p.source),
    externalId: String(p.id),
    title: plain(p.title),
    authors: plain(p.authorString),
    journal: plain(
      (p.journalInfo as { journal?: { title?: string } })?.journal?.title ??
        p.journalTitle,
    ),
    year: String(p.pubYear ?? ""),
    doi: p.doi ? String(p.doi) : undefined,
    pmcid: p.pmcid ? String(p.pmcid) : undefined,
    abstract: p.abstractText ? plain(p.abstractText) : undefined,
    openAccess: p.isOpenAccess === "Y",
    license: p.license ? String(p.license) : undefined,
  };
}
export async function search(query: string, cursor = "*") {
  const params = new URLSearchParams({
    query,
    format: "json",
    resultType: "core",
    pageSize: "10",
    cursorMark: cursor,
  });
  const data = await (await epmc(`search?${params}`)).json();
  return {
    papers: (data.resultList?.result ?? []).map(normalize),
    total: Number(data.hitCount ?? 0),
    cursor: data.nextCursorMark ?? null,
  };
}
export async function article(source: string, id: string) {
  const result = await search(`EXT_ID:${id} AND SRC:${source}`);
  if (!result.papers.length) throw new Error("Paper not found.");
  return result.papers[0] as Paper;
}
export async function fulltext(pmcid: string): Promise<SourceText> {
  const results = await search(`EXT_ID:${pmcid} AND SRC:PMC`);
  let paper = results.papers[0] as Paper | undefined;
  if (!paper) {
    const found = await search(`PMCID:${pmcid}`);
    paper = found.papers[0];
  }
  if (!paper) throw new Error("Paper not found.");
  const xml = await (await epmc(`${pmcid}/fullTextXML`)).text();
  if (xml.length > 10000000) throw new Error("Article too large.");
  const permissions =
    xml.match(/<permissions[\s>][\s\S]*?<\/permissions>/i)?.[0] ?? "";
  const licenseLink = permissions.match(
    /https?:\/\/creativecommons\.org\/(licenses\/by\/\d\.\d|publicdomain\/zero\/1\.0)\/?(?=["'<\s])/i,
  )?.[0];
  if (!licenseLink)
    throw new Error(
      "This article does not have a supported CC BY or CC0 licence. Read it on the source website.",
    );
  const parser = new XMLParser({
    ignoreAttributes: true,
    processEntities: false,
  });
  const body = parser.parse(xml)?.article?.body;
  const passages: { id: string; text: string; section: string }[] = [];
  function visit(value: unknown, section = "Article") {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((v) => visit(v, section));
      return;
    }
    const record = value as Record<string, unknown>;
    const flatten = (v: unknown): string =>
      typeof v === "string" || typeof v === "number"
        ? String(v)
        : Array.isArray(v)
          ? v.map(flatten).join(" ")
          : v && typeof v === "object"
            ? Object.values(v).map(flatten).join(" ")
            : "";
    const title = record.title ? plain(flatten(record.title)) : section;
    if (record.p) {
      for (const p of Array.isArray(record.p) ? record.p : [record.p]) {
        const text = plain(flatten(p));
        if (text.length > 40)
          passages.push({
            id: `${pmcid}:${passages.length + 1}`,
            text: text.slice(0, 6000),
            section: title,
          });
      }
    }
    for (const [k, v] of Object.entries(record))
      if (!["p", "title"].includes(k)) visit(v, title);
  }
  visit(body);
  if (!passages.length)
    throw new Error("No readable article passages are available.");
  return {
    paper: { ...paper, pmcid, license: licenseLink },
    license: licenseLink,
    passages: passages.slice(0, 100),
  };
}
