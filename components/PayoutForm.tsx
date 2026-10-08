"use client";

import { useEffect, useState, type FormEvent } from "react";
import { isValidStellarPublicKey } from "@/lib/stellar";

export interface PayoutFormProps {
  onSubmit: (address: string) => void;
}

const INVALID_ADDRESS_MESSAGE =
  "Enter a valid Stellar public key (56 characters, starting with G).";

/** Payout destination form. Rejects anything that isn't shaped like a
 * Stellar public key before calling {@link PayoutFormProps.onSubmit} --
 * a wrong or non-Stellar address here means funds sent on-chain are
 * unrecoverable, so this fails closed rather than trusting the caller to
 * validate.
 *
 * After a valid submit the button latches disabled so a double-click or
 * impatient second press cannot fire `onSubmit` twice for the same
 * address; editing the address (or the visibility-clear below) releases
 * the latch, since that is a genuinely new submission, not a duplicate. */
export function PayoutForm({ onSubmit }: PayoutFormProps) {
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Clear the in-progress payout address when the tab is backgrounded
  // (screen-shared, switched away from, etc). A partially- or fully-typed
  // payout destination left visible is a real exposure risk given how this
  // form is used -- funds sent to a wrong/malicious address on-chain are
  // unrecoverable -- so this fails closed the same way submit validation
  // does, rather than trusting the tab to stay private.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        setAddress("");
        setError(null);
        setSubmitted(false);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidStellarPublicKey(address)) {
      setError(INVALID_ADDRESS_MESSAGE);
      return;
    }

    setError(null);
    setSubmitted(true);
    onSubmit(address);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="payout-address">Payout address</label>
      <input
        id="payout-address"
        name="payout-address"
        type="text"
        value={address}
        onChange={(event) => {
          setAddress(event.target.value.trim());
          setSubmitted(false);
        }}
        aria-invalid={error !== null}
        aria-describedby={error ? "payout-address-error" : undefined}
      />
      {error ? (
        <p id="payout-address-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={submitted}>
        Send payout
      </button>
    </form>
  );
}
