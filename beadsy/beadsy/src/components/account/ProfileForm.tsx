"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/providers/StoreProvider";

export function ProfileForm({ name: initialName, email, phone: initialPhone }: { name: string; email: string; phone: string }) {
  const router = useRouter();
  const { toast, refreshUser } = useStore();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Enter your name";
    if (phone.trim() && !/^\+?[0-9][0-9\s-]{7,14}$/.test(phone.trim())) errs.phone = "Enter a valid phone number";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone }) });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save your profile");
      toast("Profile updated");
      await refreshUser();
      router.refresh();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not save your profile" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="card max-w-xl space-y-4 p-5 sm:p-7">
      <div>
        <label htmlFor="p-name" className="label">Name</label>
        <input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} maxLength={80} autoComplete="name" />
        {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="p-email" className="label">Email</label>
        <input id="p-email" className="input" value={email} disabled readOnly />
        <p className="hint">Need to change your email? Contact us and we'll help.</p>
      </div>
      <div>
        <label htmlFor="p-phone" className="label">Phone</label>
        <input id="p-phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={Boolean(errors.phone)} maxLength={16} autoComplete="tel" />
        {errors.phone && <p className="field-error" role="alert">{errors.phone}</p>}
      </div>
      {errors.form && <p role="alert" className="field-error">{errors.form}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
    </form>
  );
}
