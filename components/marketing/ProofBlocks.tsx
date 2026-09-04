import { proofBlocks } from "@/app/(marketing)/_content";
import { ReservedFrame } from "@/components/marketing/ReservedFrame";

/**
 * The three proof blocks, each with one real product screenshot.
 *
 * The screenshots do not exist yet — they need the Review screen, the editable
 * field surface and a Settings page to be built — so each renders a reserved
 * frame at final dimensions. Same reasoning as the hero (specs/002 §3.7).
 *
 * Blocks alternate sides on large screens. No accent here: the page's two-use
 * accent budget is spent on the hero wash and the rail.
 */
export function ProofBlocks() {
  return (
    <section aria-label="How it works in practice" className="border-t border-border">
      <div className="mx-auto max-w-6xl space-y-16 px-6 py-16 lg:space-y-24 lg:px-8 lg:py-24">
        {proofBlocks.map((block, index) => (
          <article
            key={block.id}
            className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
          >
            <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
              <h2 className="text-2xl font-normal tracking-tight text-foreground">
                {block.title}
              </h2>
              <p className="mt-4 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
                {block.body}
              </p>
            </div>

            <ReservedFrame
              alt={block.shot.alt}
              width={block.shot.width}
              height={block.shot.height}
              src={block.shot.src}
              sizes="(max-width: 1024px) 100vw, 576px"
              className={index % 2 === 1 ? "lg:order-1" : undefined}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
