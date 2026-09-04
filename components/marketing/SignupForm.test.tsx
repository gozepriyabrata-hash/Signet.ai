import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignupForm } from "@/components/marketing/SignupForm";
import { signupAction } from "@/lib/auth/actions";
import { deferred } from "@/test/deferred";

vi.mock("@/lib/auth/actions", () => ({
  signupAction: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

async function fillForm() {
  await userEvent.type(screen.getByLabelText("Name"), "Ada Speke");
  await userEvent.type(screen.getByLabelText("Work email"), "ada@wexley.example");
  await userEvent.type(screen.getByLabelText("Company"), "Wexley");
  await userEvent.type(screen.getByLabelText("Password"), "correct-horse-1!");
}

describe("SignupForm", () => {
  it("renders exactly the four labelled fields — no terms checkbox", () => {
    render(<SignupForm />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
    expect(screen.getByLabelText("Company")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("disables the button and swaps its label while signupAction is pending", async () => {
    const gate = deferred<Awaited<ReturnType<typeof signupAction>>>();
    vi.mocked(signupAction).mockReturnValue(gate.promise);

    render(<SignupForm />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(await screen.findByRole("button", { name: "Creating workspace…" })).toBeDisabled();

    gate.resolve({});
  });

  it("shows a field error next to the offending field", async () => {
    vi.mocked(signupAction).mockResolvedValue({
      fieldErrors: { workEmail: "An account with this email already exists." },
    });

    render(<SignupForm />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    expect(
      await screen.findByText("An account with this email already exists."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Work email")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a role=alert banner for a generic error", async () => {
    vi.mocked(signupAction).mockResolvedValue({ error: "Could not create your workspace." });

    render(<SignupForm />);
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Create workspace" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Could not create your workspace."),
    );
  });
});
