/**
 * The wireframe's "color grid transition" — the band that separates the two
 * feature sections.
 *
 * Purely decorative, so it is aria-hidden and contributes nothing to the
 * accessibility tree; a screen reader hears the two sections back to back,
 * which is the correct reading of a divider.
 *
 * It is drawn in the artwork-only pastels (docs/design-system.md). Those
 * exist for exactly this — illustration — and the same paragraph forbids them
 * on a button, on type or as a surface, none of which this is. It is also not
 * a third accent use: specs/002 §3.10 bounds `--accent`, and no --accent
 * appears here.
 *
 * Static. A "transition" in the wireframe's sense is the visual hand-off
 * between two sections, not an animation, and this page's LCP budget has no
 * room for one anyway.
 */
const BAND = [
  "bg-pastel-blue",
  "bg-pastel-violet",
  "bg-pastel-pink",
  "bg-pastel-coral",
  "bg-pastel-amber",
  "bg-pastel-green",
] as const;

export function ColorGridTransition() {
  return (
    <div
      aria-hidden="true"
      className="grid h-2 grid-cols-6 lg:h-2.5 lg:grid-cols-12"
    >
      {[...BAND, ...BAND].map((swatch, index) => (
        <span
          key={`${swatch}-${index}`}
          className={`${swatch} ${index < 6 ? "" : "hidden lg:block"}`}
        />
      ))}
    </div>
  );
}
