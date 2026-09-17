import { ReservedFrame } from "@/components/marketing/ReservedFrame";

import type { FeaturePanel } from "@/types";

/**
 * One of the wireframe's two feature bands: a labelled visual on one side, the
 * heading on the other, with the sides alternating down the page.
 *
 * The visual is a ReservedFrame, not artwork — same call as everywhere else on
 * this page. The label ("Avatar video generation", "Clip flow") sits on the
 * frame the way the wireframe writes it inside the shape, so an empty box
 * still says what it is going to hold.
 *
 * `panel.body` is rendered only when it exists. Today neither band has one,
 * because the wireframe does not give them one and _content.ts does not invent
 * copy — see specs/002 §3.12.
 */
export function FeatureSplit({ panel }: { panel: FeaturePanel }) {
  const headingId = `${panel.id}-title`;
  const mediaFirst = panel.mediaSide === "start";

  return (
    <section
      id={panel.id}
      aria-labelledby={headingId}
      className="border-t border-border"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        <div className={mediaFirst ? "lg:order-1" : "lg:order-2"}>
          <div className="relative">
            <ReservedFrame
              alt={panel.media.alt}
              width={panel.media.width}
              height={panel.media.height}
              src={panel.media.src}
              sizes="(max-width: 1024px) 100vw, 512px"
            />
            <p className="mt-4 text-sm font-light tracking-[0.01em] text-muted-foreground">
              {panel.label}
            </p>
          </div>
        </div>

        <div className={mediaFirst ? "lg:order-2" : "lg:order-1"}>
          <h2
            id={headingId}
            className="max-w-[18ch] text-3xl font-light leading-[1.1] tracking-[-0.02em] text-foreground lg:text-[2.75rem]"
          >
            {panel.title}
          </h2>

          {panel.body ? (
            <p className="mt-6 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
              {panel.body}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
