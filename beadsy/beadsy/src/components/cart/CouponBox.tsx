"use client";

import { useState } from "react";
import type { CartValidationDTO } from "@/lib/types";

/** Applies a coupon code. The code is only a request: the server validates it and returns the discount. */
export function CouponBox({ applied, result, onApply }: { applied: string; result: CartValidationDTO["coupon"]; onApply: (code: string) => void }) {
  const [code, setCode] = useState("");
  const valid = result?.valid && applied;

  if (valid) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-mint-100 px-4 py-3 text-sm">
        <span className="font-semibold text-mint-700">🎉 {result!.code} applied</span>
        <button type="button" className="font-bold text-plum-700 underline" onClick={() => onApply("")}>
          Remove
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.trim()) onApply(code.trim());
      }}
      noValidate
    >
      <label htmlFor="coupon" className="label">Have a code?</label>
      <div className="flex gap-2">
        <input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={40} placeholder="e.g. WELCOME10" autoCapitalize="characters" autoComplete="off" aria-invalid={Boolean(result && !result.valid)} aria-describedby="coupon-msg" className="input flex-1 rounded-full uppercase" />
        <button type="submit" className="btn btn-soft">Apply</button>
      </div>
      <p id="coupon-msg" role="status" className={`mt-1.5 min-h-5 text-sm font-medium ${result && !result.valid ? "text-coral-700" : ""}`}>
        {result && !result.valid ? result.message : ""}
      </p>
    </form>
  );
}
