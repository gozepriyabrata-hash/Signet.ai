"use client";

import { useScrolled } from "@/hooks/use-scrolled";

/**
 * The nav wordmark. Client leaf (rule 8) — the only interactivity in
 * `MarketingNav` is this collapse, so only this becomes a client component
 * rather than the whole nav.
 *
 * Matches anthropic.com's nav, frame-by-frame: it is not a uniform scale.
 * "ANTHROP\C" collapses to its first letter and its stylised "\", the
 * trailing letters fading out and their reserved width collapsing to 0 a
 * beat later, then reversing on the way back up. Signet has no equivalent
 * icon glyph, so the same two-stage collapse keeps the first letter, "S",
 * as the mark and folds the rest away.
 *
 * The accessible name stays "Signet" at both states via `aria-label` on the
 * link, same reasoning as `Sidebar`'s collapsed rail keeping its labels for
 * assistive tech — the visual collapse and the accessible name are allowed
 * to disagree.
 *
 * `max-width` transitions on a handful of characters, once per scroll-state
 * change, the same technique `Sidebar` already uses for its own width
 * collapse (`transition-[width] duration-150 ease-out`) — this is not the
 * generation pulse's continuous loop, so it does not need to stay
 * transform/opacity-only.
 *
 * The two properties are deliberately staggered, matching the reference: the
 * letters fade out quickly (opacity, 180ms) while the gap they leave behind
 * closes more slowly (max-width, 420ms, a gentler `cubic-bezier(0.16, 1,
 * 0.3, 1)` "ease-out-expo" curve rather than the linear-feeling default
 * `ease-out`). Sharing one duration made both properties finish together and
 * read as a single hard snap; staggering them is what makes it read as
 * "letters dissolve, then the space they held settles" instead.
 */
export function NavLogo({ label }: { label: string }) {
  const scrolled = useScrolled();
  const [first, ...rest] = label;
  const restLabel = rest.join("");

  return (
    <a
      href="#top"
      aria-label={label}
      className="flex items-center text-base font-normal text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <span aria-hidden="true">{first}</span>
      <span
        aria-hidden="true"
        className="overflow-hidden whitespace-nowrap"
        style={{
          maxWidth: scrolled ? "0ch" : "8ch",
          opacity: scrolled ? 0 : 1,
          transition: "max-width 420ms cubic-bezier(0.16, 1, 0.3, 1), opacity 180ms ease-out",
        }}
      >
        {restLabel}
      </span>
    </a>
  );
}
