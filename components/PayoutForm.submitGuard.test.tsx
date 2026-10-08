import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PayoutForm } from "./PayoutForm";

// Matches the format-level validator PayoutForm uses (lib/stellar):
// `G` plus 55 base32-alphabet characters.
const VALID_ADDRESS = `G${"A".repeat(55)}`;

// The component's visibility-clear listener reads the live DOM state, so a
// test drives it by flipping the property jsdom exposes.
function hideDocument() {
  Object.defineProperty(document, "visibilityState", {
    value: "hidden",
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PayoutForm double-submit guard", () => {
  it("ignores a second click after a valid submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PayoutForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Payout address"), VALID_ADDRESS);
    const button = screen.getByRole("button", { name: "Send payout" });
    await user.dblClick(button);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(VALID_ADDRESS);
    expect(button).toBeDisabled();
  });

  it("does not latch on a failed validation submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PayoutForm onSubmit={onSubmit} />);

    const input = screen.getByLabelText("Payout address");
    const button = screen.getByRole("button", { name: "Send payout" });

    await user.type(input, "not-a-stellar-address");
    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(button).toBeEnabled();

    await user.clear(input);
    await user.type(input, VALID_ADDRESS);
    await user.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("releases the latch when the address is edited after a submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PayoutForm onSubmit={onSubmit} />);

    const input = screen.getByLabelText("Payout address");
    const button = screen.getByRole("button", { name: "Send payout" });

    await user.type(input, VALID_ADDRESS);
    await user.click(button);
    expect(button).toBeDisabled();

    // A changed destination is a new submission, not a duplicate -- the
    // form must not stay locked after the user edits the address.
    await user.type(input, "B");
    expect(button).toBeEnabled();
  });

  it("releases the latch when the visibility clear fires", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PayoutForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Payout address"), VALID_ADDRESS);
    await user.click(screen.getByRole("button", { name: "Send payout" }));
    expect(screen.getByRole("button", { name: "Send payout" })).toBeDisabled();

    hideDocument();
    const button = screen.getByRole("button", { name: "Send payout" });
    expect(button).toBeEnabled();
    expect(screen.getByLabelText("Payout address")).toHaveValue("");
  });
});
