"use client";

import { useState } from "react";

export function NewsletterForm({ tone = "light" }: { tone?: "light" | "dark" }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setState("done");
      setMessage(data.message ?? "You're on the list!");
      setEmail("");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={submit} noValidate className="w-full max-w-md">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="newsletter-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-invalid={state === "error"}
          aria-describedby="newsletter-msg"
          className="input flex-1 rounded-full"
        />
        <button type="submit" disabled={state === "loading"} className={`btn ${tone === "dark" ? "btn-pink" : "btn-primary"}`}>
          {state === "loading" ? "Joining…" : "Join the club"}
        </button>
      </div>
      <p id="newsletter-msg" role="status" className={`mt-2 min-h-5 text-sm font-medium ${state === "error" ? "text-coral-700" : tone === "dark" ? "text-mint-300" : "text-mint-700"}`}>
        {state === "done" || state === "error" ? message : ""}
      </p>
    </form>
  );
}
