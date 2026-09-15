import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Sidebar } from "@/components/shell/Sidebar";
import { renderWithQuery } from "@/test/render-with-query";

describe("Sidebar", () => {
  it("renders New Chat as the only destination — Projects was removed", () => {
    renderWithQuery(<Sidebar accountName="Priyabrata" />);

    expect(
      screen.getByRole("link", { name: "New Chat" }),
    ).toHaveAttribute("href", "/dashboard");
    expect(
      screen.queryByRole("link", { name: "Projects" }),
    ).not.toBeInTheDocument();
  });

  it("puts the collapse toggle in its own row at the top", () => {
    renderWithQuery(<Sidebar accountName="Priyabrata" />);

    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "New chat" }),
    ).not.toBeInTheDocument();
  });

  it("no longer has a standalone New Project button — New Chat is the entry point now", () => {
    renderWithQuery(<Sidebar accountName="Priyabrata" />);

    expect(
      screen.queryByRole("button", { name: "New Project" }),
    ).not.toBeInTheDocument();
  });

  it("no longer links to Settings — that moved into the dashboard's \"+\" menu", () => {
    renderWithQuery(<Sidebar accountName="Priyabrata" />);

    expect(
      screen.queryByRole("link", { name: "Settings" }),
    ).not.toBeInTheDocument();
  });

  it("passes the signed-in account's name to the footer's ProfileMenu", () => {
    renderWithQuery(<Sidebar accountName="Priyabrata Goze" />);

    expect(
      screen.getByRole("button", { name: "Priyabrata Goze" }),
    ).toBeInTheDocument();
  });

  it("falls back to \"Account\" in the ProfileMenu when there is no name", () => {
    renderWithQuery(<Sidebar accountName={null} />);

    expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();
  });
});
