import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * The favicon, generated rather than checked in as a binary .ico.
 *
 * Sits at the app root so it applies to both root layouts — there is no
 * top-level app/layout.tsx to hang it from (specs/001).
 *
 * Literal palette values: this renders outside the browser, where the custom
 * properties in app/globals.css do not exist. They are --foreground on
 * --background from docs/design-system.md §1.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#151515",
          color: "#E9EBDF",
          fontSize: 22,
        }}
      >
        S
      </div>
    ),
    size,
  );
}
