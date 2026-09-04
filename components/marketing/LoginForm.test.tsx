import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginForm } from "@/components/marketing/LoginForm";
import { loginAction } from "@/lib/auth/actions";
import { deferred } from "@/test/deferred";

vi.mock("@/lib/auth/actions", () => ({
  loginAction: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

async function fillForm() {
  await userEvent.type(screen.getByLabelText("Work email"), "ada@wexley.example");
  await userEvent.type(screen.getByLabelText("Password"), "correct-horse-1!");
}

describe("LoginForm", () => {
  it("renders exactly the two labelled fields", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("disables the button and swaps its label while loginAction is pending", async () => {
    const gate = deferred<Awaited<ReturnType<typeof loginAction>>>();
    vi.mocked(loginAction).mockReturnValue(gate.promise);

    render(<LoginForm />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("button", { name: "Signing in…" })).toBeDisabled();

    gate.resolve({});
  });

  it("shows the same generic error whether the email or the password was wrong", async () => {
    vi.mocked(loginAction).mockResolvedValue({ error: "Invalid email or password." });

    render(<LoginForm />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password."),
    );
    // Never a per-field error — that would confirm which half was wrong.
    expect(screen.getByLabelText("Work email")).toHaveAttribute("aria-invalid", "false");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "false");
  });
});
