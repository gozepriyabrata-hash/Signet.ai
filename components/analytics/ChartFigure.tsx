"use client";

import { useId } from "react";

/**
 * The wrapper every chart on this screen uses: a titled `<figure>`, the plot,
 * and the same numbers as a real table underneath.
 *
 * ── Why the table is a disclosure and not `sr-only` ─────────────────────────
 * W3C WAI's guidance for complex images is to pair the image with a text
 * alternative — a data table for structured data — and it makes a point of
 * saying the long description should be available to everyone, not only to
 * assistive technology. "What was that third bar actually worth?" is a question
 * sighted users ask too, and a `<details>` answers it for all of them at once.
 *
 * It is also the honest fallback for the thing an SVG cannot do: on a narrow
 * viewport a twelve-point chart degrades and a table does not.
 *
 * The plot is passed a generated id to hang `aria-labelledby` on, so the
 * caption names the chart exactly once rather than being duplicated into an
 * `aria-label` that can drift from it.
 */
export function ChartFigure({
  title,
  description,
  columns,
  rows,
  children,
}: {
  title: string;
  description?: string;
  /** Header cells for the disclosure table. */
  columns: readonly [string, string];
  /** One row per mark, in the same order the marks are drawn. */
  rows: readonly { label: string; value: string }[];
  /** Receives the id the caption carries, for `aria-labelledby`. */
  children: (captionId: string) => React.ReactNode;
}) {
  const captionId = useId();

  return (
    <figure className="rounded-xs border border-border bg-surface p-6">
      <figcaption id={captionId}>
        <span className="text-base font-normal text-foreground">{title}</span>
        {description ? (
          <span className="mt-1 block text-sm font-light leading-relaxed tracking-[0.01em] text-body-foreground">
            {description}
          </span>
        ) : null}
      </figcaption>

      <div className="mt-6">{children(captionId)}</div>

      <details className="group mt-6 border-t border-border pt-4">
        <summary className="cursor-pointer list-none text-sm font-light tracking-[0.01em] text-body-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
          <span aria-hidden="true" className="mr-2 inline-block transition-transform duration-150 group-open:rotate-90">
            ›
          </span>
          Show the numbers
        </summary>

        <div className="mt-4 max-h-64 overflow-auto">
          <table className="w-full border-collapse">
            <caption className="sr-only">{title}, as a table</caption>
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-sm font-normal text-body-foreground"
                >
                  {columns[0]}
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-sm font-normal text-body-foreground"
                >
                  {columns[1]}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-border last:border-b-0"
                >
                  <th
                    scope="row"
                    className="px-3 py-2 text-left text-sm font-light text-foreground"
                  >
                    {row.label}
                  </th>
                  <td className="px-3 py-2 text-right text-sm font-light tabular-nums text-foreground">
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/**
 * The tooltip both charts share.
 *
 * Positioned in the chart's own coordinate space by the caller, which is why it
 * takes percentages rather than pixels — the SVG scales with the container and
 * a pixel offset computed at one width is wrong at every other.
 *
 * `aria-hidden` on purpose: this is a mouse and focus affordance layered over
 * marks that already carry their values in the disclosure table. Announcing it
 * would read every value twice for anyone using the table as intended.
 */
export function ChartTooltip({
  label,
  value,
  leftPct,
  visible,
}: {
  label: string;
  value: string;
  leftPct: number;
  visible: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xs border border-border bg-surface-raised px-3 py-2 whitespace-nowrap transition-opacity duration-100 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ left: `${Math.min(Math.max(leftPct, 6), 94)}%` }}
    >
      <span className="block text-sm font-light tracking-[0.01em] text-body-foreground">
        {label}
      </span>
      <span className="mt-0.5 block text-sm font-normal tabular-nums text-foreground">
        {value}
      </span>
    </div>
  );
}
