import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "ImagingQuill — Read the evidence. Write your understanding.",
    template: "%s | ImagingQuill",
  },
  description:
    "A thoughtful writing workspace for radiology learners. Build notes, explore literature, cite sources and review AI suggestions.",
  openGraph: {
    title: "ImagingQuill",
    description: "Read the evidence. Write your understanding.",
    type: "website",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
