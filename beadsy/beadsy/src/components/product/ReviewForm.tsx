"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useStore } from "@/components/providers/StoreProvider";

export function ReviewForm({ productId }: { productId: string }) {
  const { user, toast } = useStore();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);

  if (done) {
    return (
      <div role="status" className="card bg-mint-100 p-5 text-sm font-semibold text-mint-700">
        {done}
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-secondary w-full" onClick={() => setOpen(true)}>
        Write a review
      </button>
    );
  }

  if (!user) {
    return (
      <div className="card p-5 text-center">
        <p className="font-semibold">Sign in to write a review</p>
        <Link href={`/login?next=${encodeURIComponent(pathname + "#reviews")}`} className="btn btn-primary btn-sm mt-3">
          Sign in
        </Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (rating < 1) errs.rating = "Choose a star rating";
    if (title.trim().length < 2) errs.title = "Add a short title";
    if (body.trim().length < 10) errs.body = "Tell us a little more (10+ characters)";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, rating, title, body }) });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not submit your review");
      setDone(data.message ?? "Thanks for your review!");
      toast("Review submitted 💜");
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Could not submit your review" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="card space-y-4 p-5">
      <h3 className="font-sans text-lg font-bold">Write a review</h3>
      <fieldset>
        <legend className="label">Your rating</legend>
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="peer sr-only" aria-label={`${n} star${n > 1 ? "s" : ""}`} />
              <Icon name="star" size={32} filled className={`transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-plum-600 ${(hover || rating) >= n ? "text-sun-500" : "text-plum-200"}`} />
            </label>
          ))}
        </div>
        {errors.rating && <p className="field-error" role="alert">{errors.rating}</p>}
      </fieldset>
      <div>
        <label htmlFor="rv-title" className="label">Title</label>
        <input id="rv-title" className="input" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={Boolean(errors.title)} />
        {errors.title && <p className="field-error" role="alert">{errors.title}</p>}
      </div>
      <div>
        <label htmlFor="rv-body" className="label">Your review</label>
        <textarea id="rv-body" rows={4} className="input" maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} aria-invalid={Boolean(errors.body)} />
        {errors.body && <p className="field-error" role="alert">{errors.body}</p>}
      </div>
      {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Sending…" : "Submit review"}</button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      <p className="hint">Reviews are checked before they appear.</p>
    </form>
  );
}

export function HelpfulButton({ reviewId, initial }: { reviewId: string; initial: number }) {
  const { user, toast } = useStore();
  const [count, setCount] = useState(initial);
  const [voted, setVoted] = useState(false);
  const [busy, setBusy] = useState(false);

  const vote = async () => {
    if (!user) {
      toast("Sign in to mark reviews as helpful", "info");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/helpful`, { method: "POST" });
      const data = (await res.json()) as { helpful?: boolean; count?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save your vote");
      setVoted(Boolean(data.helpful));
      setCount(data.count ?? count);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save your vote", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={vote} disabled={busy} aria-pressed={voted} className="chip !min-h-8 !px-3 text-xs">
      👍 Helpful ({count})
    </button>
  );
}
