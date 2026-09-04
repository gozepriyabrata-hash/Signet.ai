import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { logos, testimonials, tiers } from "@/app/(marketing)/_content";
import { LogoStrip } from "@/components/marketing/LogoStrip";
import { PricingPreview } from "@/components/marketing/PricingPreview";
import { Testimonials } from "@/components/marketing/Testimonials";

/**
 * specs/002 §3.12 made a rule out of an empty array: sections whose content
 * does not exist render nothing, rather than showing invented social proof or
 * unapproved pricing.
 *
 * These are regression tests for that rule, not for the arrays' current
 * values. The day real logos land, the first test's premise changes and it
 * should be updated deliberately — not deleted.
 */
describe("sections with no content yet", () => {
  it("renders no logo strip while there are no consented logos", () => {
    expect(logos).toHaveLength(0);

    const { container } = render(<LogoStrip />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders no testimonial while there is no real, named quote", () => {
    expect(testimonials).toHaveLength(0);

    const { container } = render(<Testimonials />);
    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Pricing is the exception, and the reason matters: #pricing is one of the
   * three nav anchors, so this section must always leave a target behind. Only
   * the tier grid is dormant.
   */
  it("still renders the pricing anchor, but no invented tiers", () => {
    expect(tiers).toHaveLength(0);

    const { container } = render(<PricingPreview />);

    expect(container.querySelector("#pricing")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Pricing" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
