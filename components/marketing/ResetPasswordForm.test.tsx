import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResetPasswordForm } from "@/components/marketing/ResetPasswordForm";
import { resetPasswordAction } from "@/lib/auth/actions";
import { deferred } from "@/test/deferred";

vi.mock("@/lib/auth/actions", () => ({
  resetPasswordAction: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("ResetPasswordForm", () => {
  it("renders one field", () => {
    render(<ResetPasswordForm token="abc123" />);
    expect(screen.getByLabelText("New password")).toBeInTheDocument();
  });

  it("disables the button and swaps its label while pending", async () => {
    const gate = deferred<Awaited<ReturnType<typeof resetPasswordAction>>>();
    vi.mocked(resetPasswordAction).mockReturnValue(gate.promise);

    render(<ResetPasswordForm token="abc123" />);
    await userEvent.type(screen.getByLabelText("New password"), "correct-horse-1!");
    await userEvent.click(screen.getByRole("button", { name: "Set new password" }));

    expect(await screen.findByRole("button", { name: "Setting password…" })).toBeDisabled();

    gate.resolve({});
  });

  it("shows a role=alert banner for an invalid or expired token", async () => {
    vi.mocked(resetPasswordAction).mockResolvedValue({
      error: "This reset link is invalid or has expired. Request a new one.",
    });

    render(<ResetPasswordForm token="abc123" />);
    await userEvent.type(screen.getByLabelText("New password"), "correct-horse-1!");
    await userEvent.click(screen.getByRole("button", { name: "Set new password" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/invalid or has expired/i),
    );
  });
});
