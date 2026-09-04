import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { faq } from "@/app/(marketing)/_content";
import { Faq } from "@/components/marketing/Faq";

/**
 * specs/002 §3.5 splits the two disclosures deliberately: the FAQ uses native
 * <details>/<summary> and ships no JavaScript, while the nav does not. These
 * pin the FAQ half — including the marker, which must be restyled and never
 * removed, because Firefox folds it into the summary's accessible name.
 */
describe("Faq", () => {
  it("renders every question as a summary inside a details", () => {
    const { container } = render(<Faq />);

    const details = container.querySelectorAll("details");
    expect(details).toHaveLength(faq.length);

    details.forEach((element) => {
      expect(element.querySelector("summary")).not.toBeNull();
    });
  });

  it("ships no JavaScript-driven toggle — the answers are in the DOM", () => {
    render(<Faq />);
    expect(
      screen.getByText(faq[0].answer, { exact: false }),
    ).toBeInTheDocument();
  });

  it("keeps the native marker rather than hiding it", () => {
    const { container } = render(<Faq />);
    const summary = container.querySelector("summary");

    // `list-none` would strip the marker and cost Firefox users the
    // open/closed state. `list-item` keeps it, restyled via ::marker.
    expect(summary?.className).not.toContain("list-none");
    expect(summary?.className).toContain("list-item");
  });

  it("is reachable by its footer anchor", () => {
    const { container } = render(<Faq />);
    expect(container.querySelector("#faq")).toBeInTheDocument();
  });
});
