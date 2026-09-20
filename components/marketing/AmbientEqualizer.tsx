/**
 * The closing CTA's ambient background — the reference video's footer is a
 * field of vertical frequency-bar columns behind "Ready to build something
 * bold?". Reinterpreted here as a field of thin dashed columns in `--border`,
 * never a literal audio visualiser (there is no audio on this page), purely
 * atmospheric texture behind `FinalCta`'s real content.
 *
 * Bar heights are a deterministic function of index — two out-of-phase sine
 * terms, not `Math.random()` — so the server-rendered markup and the first
 * client render agree exactly; a random height here would desync them and
 * fail hydration. Server Component: nothing here needs a client boundary,
 * the per-bar "breathe" animation is a CSS keyframe (`.equalizer-bar`,
 * app/globals.css) with a per-bar `animationDelay` staggered by index, and
 * `prefers-reduced-motion` already collapses it via the existing global rule.
 * `aria-hidden` and `pointer-events-none`: decorative only.
 */
const BAR_COUNT = 140;

const bars = Array.from({ length: BAR_COUNT }, (_, i) => ({
  heightPercent: 14 + 56 * Math.abs(Math.sin(i * 0.37) * Math.cos(i * 0.13)),
  delaySeconds: (i % 9) * 0.35,
}));

export function AmbientEqualizer() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-70 motion-reduce:opacity-30"
    >
      {/* `flex-1` bars, not a fixed width: the reference's field spans the
          full section edge to edge at any viewport width, so each bar takes
          an equal share of the row instead of a fixed px width that would
          leave the row narrower than the section on wide screens. */}
      <div className="absolute inset-x-0 bottom-0 flex h-full items-end gap-[2px] px-2">
        {bars.map((bar, i) => (
          <span
            key={i}
            className="equalizer-bar min-w-0 flex-1 rounded-t-[1px]"
            style={{
              height: `${bar.heightPercent}%`,
              animationDelay: `${bar.delaySeconds}s`,
              backgroundImage:
                "repeating-linear-gradient(to top, var(--border) 0px, var(--border) 1px, transparent 1px, transparent 6px)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
