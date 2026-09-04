import { security } from "@/app/(marketing)/_content";

/**
 * The security band. An in-page anchor, not a route (specs/001 §6).
 *
 * The claims here are the public statement of CLAUDE.md rules 11 and 12 — no
 * recipient PII in URLs or logs, client-side upload validation, and no send
 * without a recorded human approval. Do not add a claim to this list that the
 * product does not actually enforce.
 */
export function SecurityNote() {
  return (
    <section id="security" className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
        <div>
          <h2 className="text-2xl font-normal tracking-tight text-foreground">
            {security.title}
          </h2>
          <p className="mt-4 max-w-[60ch] text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {security.body}
          </p>
        </div>

        <ul className="space-y-4">
          {security.points.map((point) => (
            <li
              key={point}
              className="rounded-xs border border-border bg-surface p-6 text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground"
            >
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
