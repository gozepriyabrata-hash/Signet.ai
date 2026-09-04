import Image from "next/image";

import { logos } from "@/app/(marketing)/_content";

/**
 * The trusted-by strip.
 *
 * Renders nothing while `logos` is empty — which it is, and will be until real
 * customers with real permission exist. An empty array is what makes
 * docs/screens.md's "never invented social proof" enforceable rather than
 * aspirational (specs/002 §3.12).
 *
 * Logo walls stay uniformly --muted-foreground; colour customer logos are an
 * anti-pattern here (docs/design-system.md §6).
 */
export function LogoStrip() {
  if (logos.length === 0) return null;

  return (
    <section aria-label="Customers" className="border-y border-border">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
          {logos.map((logo) => (
            <li key={logo.name} className="text-muted-foreground">
              <Image
                src={logo.src}
                alt={logo.name}
                width={logo.width}
                height={logo.height}
                className="opacity-70"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
