import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileMenu } from "@/components/shell/ProfileMenu";

const logoutAction = vi.fn();
const setTheme = vi.fn();
let currentTheme = "dark";

vi.mock("@/lib/auth/actions", () => ({
  logoutAction: (...args: unknown[]) => logoutAction(...args),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: currentTheme, setTheme }),
}));

beforeEach(() => {
  logoutAction.mockReset();
  setTheme.mockReset();
  currentTheme = "dark";
});

describe("ProfileMenu", () => {
  it("shows initials and the account name on the trigger", () => {
    render(<ProfileMenu name="Priyabrata Goze" />);

    expect(screen.getByText("PG")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Priyabrata Goze" }),
    ).toBeInTheDocument();
  });

  it("falls back to \"Account\" when there is no signed-in name", () => {
    render(<ProfileMenu name={null} />);

    expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();
  });

  it("is closed until the trigger is clicked, then offers Theme and Sign out but not the swatches yet", async () => {
    render(<ProfileMenu name="Priyabrata" />);

    expect(screen.queryByRole("menuitem", { name: "Sign out" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Priyabrata" }));

    expect(screen.getByRole("menuitem", { name: "Theme" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitemradio", { name: "Light" }),
    ).not.toBeInTheDocument();
  });

  it("reveals the three theme swatches only once 'Theme' is tapped", async () => {
    render(<ProfileMenu name="Priyabrata" />);

    await userEvent.click(screen.getByRole("button", { name: "Priyabrata" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Theme" }));

    for (const label of ["Light", "Dark", "Greeny Dark"]) {
      expect(screen.getByRole("menuitemradio", { name: label })).toBeInTheDocument();
    }
  });

  it("marks the active theme as checked", async () => {
    currentTheme = "greeny-dark";
    render(<ProfileMenu name="Priyabrata" />);

    await userEvent.click(screen.getByRole("button", { name: "Priyabrata" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Theme" }));

    expect(screen.getByRole("menuitemradio", { name: "Greeny Dark" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemradio", { name: "Dark" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("switches theme and closes the whole menu when a swatch is chosen", async () => {
    render(<ProfileMenu name="Priyabrata" />);

    await userEvent.click(screen.getByRole("button", { name: "Priyabrata" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Theme" }));
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Light" }));

    expect(setTheme).toHaveBeenCalledWith("light");
    expect(screen.queryByRole("menuitemradio", { name: "Light" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("signs out when 'Sign out' is chosen", async () => {
    render(<ProfileMenu name="Priyabrata" />);

    await userEvent.click(screen.getByRole("button", { name: "Priyabrata" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(logoutAction).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", async () => {
    render(<ProfileMenu name="Priyabrata" />);

    await userEvent.click(screen.getByRole("button", { name: "Priyabrata" }));
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("menuitem", { name: "Sign out" })).not.toBeInTheDocument();
  });
});
