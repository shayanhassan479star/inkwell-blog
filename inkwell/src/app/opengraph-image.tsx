import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = site.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#faf7f2", color: "#1c1917", padding: 80, fontFamily: "Georgia, serif" }}>
        <div style={{ fontSize: 28, letterSpacing: 6, textTransform: "uppercase", color: "#b3361b", display: "flex" }}>Independent writing</div>
        <div style={{ fontSize: 96, lineHeight: 1.05, display: "flex" }}>{site.tagline}</div>
        <div style={{ fontSize: 40, display: "flex" }}>{site.name}<span style={{ color: "#b3361b" }}>.</span></div>
      </div>
    ),
    size,
  );
}
