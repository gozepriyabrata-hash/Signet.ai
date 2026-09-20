import { security } from "@/app/(marketing)/_content";
import { TiltReveal } from "@/components/marketing/TiltReveal";

/**
 * The reference video's giant stacked-type divider ("A.I. / DESIGN /
 * DEVELOPMENT / BRANDING"), reinterpreted with `security`'s real title and
 * body instead of a fabricated services list (specs/017). This repo's type
 * scale already reserves 72px/weight-300 display type for exactly this kind
 * of moment (docs/design-system.md §2), so the "giant type" read comes from
 * that existing scale rather than from a new one invented for this section.
 *
 * `bg-surface`, not `bg-background`: specs/017 §3 gets the reference's
 * light/dark section rhythm from alternating surface tokens instead of a
 * per-section theme toggle, which this design system does not describe.
 */
export function SecurityBigType() {
  return (
    <section id="security" className="border-t border-border bg-surface">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center lg:px-8 lg:py-28">
        <h2 className="mx-auto text-5xl font-light leading-[1.05] tracking-[-0.022em] text-foreground sm:text-7xl lg:text-[6rem]">
          {security.title}
        </h2>
        <p className="mx-auto mt-8 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
          {security.body}
        </p>

        <ul className="mx-auto mt-16 grid gap-6 text-left sm:grid-cols-3">
          {security.points.map((point, index) => (
            <li key={point}>
              <TiltReveal delayMs={index * 90}>
                <div className="h-full rounded-xs border border-border bg-background p-6 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
                  {point}
                </div>
              </TiltReveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
