import type { MetadataRoute } from "next";
import { templates } from "@/lib/templates";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return [
    "",
    "/templates",
    "/privacy",
    "/sources",
    ...templates.map((t) => `/templates/${t.slug}`),
  ].map((path) => ({ url: base + path }));
}
