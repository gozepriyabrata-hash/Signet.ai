import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Navbar } from "@/components/shell/Navbar";
import { renderWithQuery } from "@/test/render-with-query";

describe("Navbar", () => {
  it("shows the signed-in account's menu on the right", () => {
    renderWithQuery(<Navbar accountName="Priyabrata Goze" />);

    expect(
      screen.getByRole("button", { name: "Priyabrata Goze" }),
    ).toBeInTheDocument();
  });

  it("falls back to \"Account\" when there is no name", () => {
    renderWithQuery(<Navbar accountName={null} />);

    expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();
  });
});
