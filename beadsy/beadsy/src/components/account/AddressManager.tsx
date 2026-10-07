"use client";

import { useCallback, useEffect, useState } from "react";
import { AddressFields, EMPTY_ADDRESS, validateAddress, type AddressDraft, type FieldErrors } from "@/components/checkout/AddressFields";
import { useStore } from "@/components/providers/StoreProvider";
import { StatePanel } from "@/components/ui/States";

interface Addr extends AddressDraft {
  id: string;
  isDefault: boolean;
}

export function AddressManager() {
  const { toast } = useStore();
  const [list, setList] = useState<Addr[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<AddressDraft>(EMPTY_ADDRESS);
  const [makeDefault, setMakeDefault] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/addresses");
      if (!res.ok) throw new Error();
      setList(((await res.json()) as { addresses: Addr[] }).addresses);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startNew = () => {
    setDraft(EMPTY_ADDRESS);
    setMakeDefault(false);
    setErrors({});
    setEditing("new");
  };
  const startEdit = (a: Addr) => {
    setDraft({ fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, postalCode: a.postalCode });
    setMakeDefault(a.isDefault);
    setErrors({});
    setEditing(a.id);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateAddress(draft);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const isNew = editing === "new";
      const res = await fetch(isNew ? "/api/addresses" : `/api/addresses/${editing}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, country: "IN", isDefault: makeDefault }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save the address");
      toast("Address saved");
      setEditing(null);
      await load();
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not save the address" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Address deleted", "info");
      await load();
    } catch {
      toast("Couldn't delete that address", "error");
    }
  };

  if (failed) return <StatePanel compact art="charm" tone="pink" title="Couldn't load addresses" message="Please try again." actions={[{ label: "Retry", onClick: () => void load() }]} />;
  if (!list) return <div className="space-y-3" aria-busy="true"><div className="skeleton h-28" /><div className="skeleton h-28" /></div>;

  if (editing) {
    return (
      <form onSubmit={save} noValidate className="card space-y-5 p-5 sm:p-7">
        <h3 className="font-sans text-lg font-bold">{editing === "new" ? "Add an address" : "Edit address"}</h3>
        <AddressFields value={draft} onChange={setDraft} errors={errors} idPrefix="acc" />
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
          <input type="checkbox" className="size-5 accent-plum-700" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} /> Make this my default address
        </label>
        {errors.form && <p role="alert" className="field-error">{errors.form}</p>}
        <div className="flex gap-3">
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save address"}</button>
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {list.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-display text-2xl font-semibold">No saved addresses</p>
          <p className="mt-1 text-muted">Save one to make checkout a one-tap affair.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {list.map((a) => (
            <li key={a.id} className="card flex flex-col p-5 text-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold">{a.fullName}</p>
                {a.isDefault && <span className="badge bg-mint-100 text-mint-700">Default</span>}
              </div>
              <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
              <p>{a.city}, {a.state} {a.postalCode}</p>
              <p className="text-muted">{a.phone}</p>
              <div className="mt-4 flex gap-3 pt-1">
                <button type="button" className="text-sm font-bold text-plum-700 underline" onClick={() => startEdit(a)}>Edit</button>
                <button type="button" className="text-sm font-bold text-coral-700 underline" onClick={() => void remove(a.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn-primary" onClick={startNew}>Add a new address</button>
    </div>
  );
}
