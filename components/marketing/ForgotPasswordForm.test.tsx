import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ForgotPasswordForm } from "@/components/marketing/ForgotPasswordForm";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { deferred } from "@/test/deferred";

vi.mock("@/lib/auth/actions", () => ({
  forgotPasswordAction: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

async function submit() {
  await userEvent.type(screen.getByLabelText("Work email"), "ada@wexley.example");
  await userEvent.click(screen.getByRole("button", { name: "Send reset link" }));
}

describe("ForgotPasswordForm", () => {
  it("renders one field", () => {
    render(<ForgotPasswordForm />);
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
  });

  it("disables the button and swaps its label while pending", async () => {
    const gate = deferred<Awaited<ReturnType<typeof forgotPasswordAction>>>();
    vi.mocked(forgotPasswordAction).mockReturnValue(gate.promise);

    render(<ForgotPasswordForm />);
    await submit();

    expect(await screen.findByRole("button", { name: "Sending…" })).toBeDisabled();

    gate.resolve({ submitted: true });
  });

  it("shows the same confirmation whether or not devResetLink is present", async () => {
    vi.mocked(forgotPasswordAction).mockResolvedValue({ submitted: true });

    render(<ForgotPasswordForm />);
    await submit();

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "If an account exists for that email",
      ),
    );
    expect(screen.queryByText(/dev mode/i)).not.toBeInTheDocument();
  });

  it("renders the dev reset link when present, clearly labelled as dev-only", async () => {
    vi.mocked(forgotPasswordAction).mockResolvedValue({
      submitted: true,
      devResetLink: "/reset-password?token=abc123",
    });

    render(<ForgotPasswordForm />);
    await submit();

    expect(await screen.findByText(/dev mode/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "/reset-password?token=abc123" })).toHaveAttribute(
      "href",
      "/reset-password?token=abc123",
    );
  });
});
