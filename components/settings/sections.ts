/**
 * The nine Settings sections, in nav order.
 *
 * A plain module rather than an export from `SettingsNav.tsx`, and the reason is
 * not tidiness: `SettingsNav` is a `"use client"` module, and a non-component
 * value imported from one into a Server Component arrives as a client-reference
 * proxy rather than the array itself. `SectionPlaceholder` calling `.find()` on
 * that proxy failed the production build while working perfectly in `next dev`.
 *
 * Shared data belongs outside the component that happens to render it.
 */
export const SETTINGS_SECTIONS: ReadonlyArray<{
  segment: string;
  label: string;
  summary: string;
}> = [
  { segment: "avatar", label: "Avatar", summary: "Avatars and custom uploads" },
  { segment: "voice", label: "Voice", summary: "Voices and voice cloning" },
  { segment: "video", label: "Video", summary: "Templates, formats, branding" },
  { segment: "ai", label: "AI", summary: "Script styles and guardrails" },
  { segment: "email", label: "Email", summary: "Templates, CTAs, signatures" },
  { segment: "recipients", label: "Recipients", summary: "Saved recipients and segments" },
  { segment: "analytics", label: "Analytics", summary: "What is measured, if anything" },
  { segment: "security", label: "Security", summary: "Access, retention, data handling" },
  { segment: "usage", label: "Usage", summary: "Quota and spend" },
];
