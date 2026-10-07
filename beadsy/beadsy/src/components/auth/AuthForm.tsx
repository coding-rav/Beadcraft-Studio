"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/components/providers/StoreProvider";
import { safeRedirectPath } from "@/lib/utils";

type Mode = "login" | "register" | "forgot" | "reset";

const COPY: Record<Mode, { title: string; button: string; endpoint: string }> = {
  login: { title: "Welcome back", button: "Sign in", endpoint: "/api/auth/login" },
  register: { title: "Create your account", button: "Create account", endpoint: "/api/auth/register" },
  forgot: { title: "Forgot your password?", button: "Send reset link", endpoint: "/api/auth/forgot-password" },
  reset: { title: "Choose a new password", button: "Update password", endpoint: "/api/auth/reset-password" },
};

export function AuthForm({ mode, next, token }: { mode: Mode; next?: string; token?: string }) {
  const router = useRouter();
  const { refreshUser, toast } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const c = COPY[mode];
  const dest = safeRedirectPath(next, "/account");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (mode === "register" && name.trim().length < 2) errs.name = "Enter your name";
    if (mode !== "reset" && !/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email address";
    if (mode !== "forgot" && password.length < (mode === "login" ? 1 : 8)) errs.password = mode === "login" ? "Enter your password" : "Use at least 8 characters";
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const body = mode === "register" ? { name, email, password } : mode === "login" ? { email, password } : mode === "forgot" ? { email } : { token, password };
      const res = await fetch(c.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json()) as { error?: string; message?: string; issues?: { path: string; message: string }[] };
      if (!res.ok) {
        if (data.issues?.length) setErrors(Object.fromEntries(data.issues.map((i) => [i.path, i.message])));
        throw new Error(data.error ?? "Something went wrong");
      }
      if (mode === "forgot") {
        setInfo(data.message ?? "Check your inbox for a reset link.");
      } else if (mode === "reset") {
        toast("Password updated. Please sign in.");
        router.push("/login");
      } else {
        await refreshUser();
        toast(mode === "register" ? "Welcome to Beadsy! 💜" : "Signed in");
        router.push(dest);
        router.refresh();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-10 sm:py-16">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-3xl font-semibold">{c.title}</h1>
        {mode === "forgot" && <p className="mt-2 text-sm text-muted">Enter your email and we'll send you a link to choose a new one.</p>}

        {info ? (
          <div role="status" className="mt-6 rounded-2xl bg-mint-100 p-4 text-sm font-semibold text-mint-700">{info}</div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            {mode === "register" && (
              <div>
                <label htmlFor="name" className="label">Name</label>
                <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} className="input" maxLength={80} />
                {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
              </div>
            )}
            {mode !== "reset" && (
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} className="input" maxLength={254} />
                {errors.email && <p className="field-error" role="alert">{errors.email}</p>}
              </div>
            )}
            {mode !== "forgot" && (
              <div>
                <label htmlFor="password" className="label">{mode === "reset" ? "New password" : "Password"}</label>
                <input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(errors.password)} className="input" maxLength={72} />
                {errors.password && <p className="field-error" role="alert">{errors.password}</p>}
                {mode !== "login" && <p className="hint">At least 8 characters.</p>}
              </div>
            )}
            {mode === "login" && (
              <p className="text-right text-sm"><Link href="/forgot-password" className="font-semibold text-plum-700 underline">Forgot password?</Link></p>
            )}
            {formError && <p role="alert" className="rounded-xl bg-coral-500/10 p-3 text-sm font-semibold text-coral-700">{formError}</p>}
            <button type="submit" disabled={busy} className="btn btn-primary btn-lg w-full">{busy ? "Please wait…" : c.button}</button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          {mode === "login" && <>New to Beadsy? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-plum-700 underline">Create an account</Link></>}
          {mode === "register" && <>Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-bold text-plum-700 underline">Sign in</Link></>}
          {(mode === "forgot" || mode === "reset") && <Link href="/login" className="font-bold text-plum-700 underline">Back to sign in</Link>}
        </p>
      </div>
    </div>
  );
}
