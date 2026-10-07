"use client";

import { useState } from "react";
import { useStore } from "@/components/providers/StoreProvider";

export function SettingsPanel() {
  const { toast } = useStore();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!current) return setError("Enter your current password");
    if (next.length < 8) return setError("Your new password must be at least 8 characters");
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: current, newPassword: next }) });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not change your password");
      toast("Password changed. Other devices have been signed out.");
      setCurrent("");
      setNext("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change your password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={submit} noValidate className="card max-w-xl space-y-4 p-5 sm:p-7">
        <h3 className="font-sans text-lg font-bold">Change password</h3>
        <div>
          <label htmlFor="cur" className="label">Current password</label>
          <input id="cur" type="password" autoComplete="current-password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} maxLength={72} />
        </div>
        <div>
          <label htmlFor="new" className="label">New password</label>
          <input id="new" type="password" autoComplete="new-password" className="input" value={next} onChange={(e) => setNext(e.target.value)} maxLength={72} />
          <p className="hint">At least 8 characters.</p>
        </div>
        {error && <p role="alert" className="field-error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
      </form>
    </div>
  );
}
