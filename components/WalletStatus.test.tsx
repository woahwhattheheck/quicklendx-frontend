import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectWallet } from "@/lib/wallet";
import { WalletStatus } from "./WalletStatus";

vi.mock("@/lib/wallet", () => ({ connectWallet: vi.fn() }));

beforeEach(() => {
  vi.mocked(connectWallet).mockReset();
});

describe("WalletStatus (#32)", () => {
  it("shows approval and immediately clears the connected pill on disconnect", async () => {
    const user = userEvent.setup();
    vi.mocked(connectWallet).mockResolvedValue({
      publicKey: "GABCDEFGHIJKLMNOPQRSTUVWX12345",
      error: null,
    });
    render(<WalletStatus />);

    expect(screen.getByRole("status")).toHaveTextContent("Wallet disconnected");
    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    expect(await screen.findByRole("button", { name: "Disconnect wallet" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Connected: GABCD…2345");

    await user.click(screen.getByRole("button", { name: "Disconnect wallet" }));
    expect(screen.getByRole("status")).toHaveTextContent("Wallet disconnected");
    expect(screen.getByRole("status")).not.toHaveTextContent("GABCD");
  });

  it("ignores late wallet approval after cancelling a pending connection", async () => {
    const user = userEvent.setup();
    let approve!: (value: { publicKey: string; error: null }) => void;
    vi.mocked(connectWallet).mockImplementation(
      () => new Promise((resolve) => { approve = resolve; })
    );
    render(<WalletStatus />);

    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    await user.click(screen.getByRole("button", { name: "Cancel connection" }));
    expect(screen.getByRole("status")).toHaveTextContent("Wallet disconnected");

    await act(async () => {
      approve({ publicKey: "GSTALE123", error: null });
    });
    expect(screen.getByRole("status")).toHaveTextContent("Wallet disconnected");
    expect(screen.queryByRole("button", { name: "Disconnect wallet" })).not.toBeInTheDocument();
  });

  it("keeps the status disconnected on user rejection and recovers on retry", async () => {
    const user = userEvent.setup();
    vi.mocked(connectWallet)
      .mockResolvedValueOnce({ publicKey: null, error: "User declined access" })
      .mockResolvedValueOnce({ publicKey: "GVALID1234", error: null });
    render(<WalletStatus />);

    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("User declined access");
    expect(screen.getByRole("status")).toHaveTextContent("Wallet disconnected");

    await user.click(screen.getByRole("button", { name: "Retry wallet connection" }));
    expect(await screen.findByRole("button", { name: "Disconnect wallet" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps a disconnected pill after an extension exception", async () => {
    const user = userEvent.setup();
    vi.mocked(connectWallet).mockRejectedValue(new Error("Freighter unavailable"));
    render(<WalletStatus />);

    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not connect to Freighter");
    expect(screen.getByRole("status")).toHaveTextContent("Wallet disconnected");
  });
});
