import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PayoutForm } from "./PayoutForm";

// Checksum-valid StrKey address (same fixture as lib/stellarAddress.test.ts).
// The form now verifies the CRC16 checksum, so a made-up `G + "A"*55` string
// would fail validation and break these tests.
const VALID_KEY = "GABQUEIYD4TC2NB3IJEVAV26MVWHG6UBRCHZNHNEVOZLTQGHZ3K5YMUR";
// Same as VALID_KEY with the final character swapped -- correct prefix and
// length, but the checksum no longer matches.
const TAMPERED_KEY = "GABQUEIYD4TC2NB3IJEVAV26MVWHG6UBRCHZNHNEVOZLTQGHZ3K5YMUA";

describe("PayoutForm", () => {
  it("calls onSubmit with a valid Stellar address", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PayoutForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Payout address"), VALID_KEY);
    await user.click(screen.getByRole("button", { name: "Send payout" }));

    expect(onSubmit).toHaveBeenCalledWith(VALID_KEY);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("rejects a non-Stellar address and does not call onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PayoutForm onSubmit={onSubmit} />);

    await user.type(
      screen.getByLabelText("Payout address"),
      "0x71C7656EC7ab88b098defB751B7401B5f6d8976"
    );
    await user.click(screen.getByRole("button", { name: "Send payout" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid Stellar public key (56 characters, starting with G)."
    );
  });

  it("rejects a well-formed address with a bad checksum", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PayoutForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("Payout address"), TAMPERED_KEY);
    await user.click(screen.getByRole("button", { name: "Send payout" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid Stellar public key (56 characters, starting with G)."
    );
  });

  it("clears a previous error once a valid address is submitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PayoutForm onSubmit={onSubmit} />);

    const input = screen.getByLabelText("Payout address");
    await user.type(input, "not-a-stellar-address");
    await user.click(screen.getByRole("button", { name: "Send payout" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, VALID_KEY);
    await user.click(screen.getByRole("button", { name: "Send payout" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith(VALID_KEY);
  });

  it("clears the address when the tab is backgrounded", async () => {
    const user = userEvent.setup();
    render(<PayoutForm onSubmit={vi.fn()} />);

    const input = screen.getByLabelText<HTMLInputElement>("Payout address");
    await user.type(input, VALID_KEY);
    expect(input.value).toBe(VALID_KEY);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(input.value).toBe("");
  });

  it("does not clear the address when the tab becomes visible again", async () => {
    const user = userEvent.setup();
    render(<PayoutForm onSubmit={vi.fn()} />);

    const input = screen.getByLabelText<HTMLInputElement>("Payout address");
    await user.type(input, VALID_KEY);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(input.value).toBe(VALID_KEY);
  });
});
