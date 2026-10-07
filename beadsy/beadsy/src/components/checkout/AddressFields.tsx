"use client";

import type { AddressInput } from "@/lib/validation";

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export type AddressDraft = Omit<AddressInput, "country" | "label"> & { label?: string };
export const EMPTY_ADDRESS: AddressDraft = { fullName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "" };

export type FieldErrors = Partial<Record<string, string>>;

export function validateAddress(a: AddressDraft): FieldErrors {
  const e: FieldErrors = {};
  if (a.fullName.trim().length < 2) e.fullName = "Enter the recipient's name";
  if (!/^\+?[0-9][0-9\s-]{7,14}$/.test(a.phone.trim())) e.phone = "Enter a valid phone number";
  if (a.line1.trim().length < 3) e.line1 = "Enter the street address";
  if (a.city.trim().length < 2) e.city = "Enter the city";
  if (!a.state) e.state = "Choose a state";
  if (!/^[1-9][0-9]{5}$/.test(a.postalCode.trim())) e.postalCode = "Enter a valid 6-digit PIN code";
  return e;
}

export function AddressFields({ value, onChange, errors, idPrefix = "addr" }: { value: AddressDraft; onChange: (v: AddressDraft) => void; errors: FieldErrors; idPrefix?: string }) {
  const set = <K extends keyof AddressDraft>(k: K, v: AddressDraft[K]) => onChange({ ...value, [k]: v });
  const field = (id: keyof AddressDraft, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, span2 = false) => (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <label htmlFor={`${idPrefix}-${id}`} className="label">{label}</label>
      <input
        id={`${idPrefix}-${id}`}
        name={id}
        value={(value[id] as string | undefined) ?? ""}
        onChange={(e) => set(id, e.target.value as never)}
        aria-invalid={Boolean(errors[id])}
        aria-describedby={errors[id] ? `${idPrefix}-${id}-err` : undefined}
        className="input"
        {...props}
      />
      {errors[id] && (
        <p id={`${idPrefix}-${id}-err`} className="field-error" role="alert">
          {errors[id]}
        </p>
      )}
    </div>
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {field("fullName", "Full name", { autoComplete: "name", maxLength: 80 }, true)}
      {field("phone", "Phone", { type: "tel", autoComplete: "tel", inputMode: "tel", maxLength: 16, placeholder: "98765 43210" }, true)}
      {field("line1", "Address", { autoComplete: "address-line1", maxLength: 120, placeholder: "House no., building, street" }, true)}
      {field("line2", "Apartment, landmark (optional)", { autoComplete: "address-line2", maxLength: 120 }, true)}
      {field("city", "City", { autoComplete: "address-level2", maxLength: 60 })}
      <div>
        <label htmlFor={`${idPrefix}-state`} className="label">State</label>
        <select id={`${idPrefix}-state`} name="state" value={value.state} onChange={(e) => set("state", e.target.value)} aria-invalid={Boolean(errors.state)} className="input" autoComplete="address-level1">
          <option value="">Select state…</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {errors.state && <p className="field-error" role="alert">{errors.state}</p>}
      </div>
      {field("postalCode", "PIN code", { autoComplete: "postal-code", inputMode: "numeric", maxLength: 6, placeholder: "560001" })}
      <div>
        <label className="label" htmlFor={`${idPrefix}-country`}>Country</label>
        <input id={`${idPrefix}-country`} className="input" value="India" disabled readOnly />
        <p className="hint">We currently deliver within India.</p>
      </div>
    </div>
  );
}
