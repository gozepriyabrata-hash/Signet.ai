import { ImageResponse } from "next/og";

import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE_NAME} — review every AI package before it sends`;

/**
 * The social card.
 *
 * Rendered in ImageResponse's default face rather than the brand font: loading
 * Inter here means reading a .woff2 out of node_modules at module scope, which
 * is fragile. When Saans is licensed the file becomes a local asset and this
 * gets the real face. Known compromise, recorded in the implementation plan.
 *
 * ImageResponse supports flexbox and a subset of CSS only — no grid.
 * Colours are the literal dark-palette values because this renders outside the
 * browser, where the CSS custom properties in app/globals.css do not exist.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#151515",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", color: "#E9EBDF", fontSize: 32 }}>
          {SITE_NAME}
        </div>

        <div
          style={{
            display: "flex",
            color: "#E9EBDF",
            fontSize: 64,
            lineHeight: 1.15,
            letterSpacing: "-0.022em",
            maxWidth: "18ch",
          }}
        >
          {SITE_TAGLINE}
        </div>

        <div style={{ display: "flex", color: "#8B867F", fontSize: 26 }}>
          Report → Recipient → Analysis → Video → Email → Review → Send
        </div>
      </div>
    ),
    size,
  );
}
