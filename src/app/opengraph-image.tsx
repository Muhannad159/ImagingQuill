import { ImageResponse } from "next/og";
export const alt =
  "ImagingQuill — Read the evidence. Write your understanding.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#f7f6f1",
        color: "#173e3b",
        width: "100%",
        height: "100%",
        padding: 80,
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 70 }}>ImagingQuill</div>
      <div style={{ fontSize: 72 }}>Read the evidence.</div>
      <div style={{ fontSize: 72 }}>Write your understanding.</div>
      <div style={{ fontSize: 24, marginTop: 40 }}>
        A writing workspace for radiology learners.
      </div>
    </div>,
    size,
  );
}
