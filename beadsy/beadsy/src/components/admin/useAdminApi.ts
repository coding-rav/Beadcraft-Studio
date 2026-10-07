"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useStore } from "@/components/providers/StoreProvider";

/** Small helper for admin forms: sends JSON, surfaces server validation errors, refreshes the page data. */
export function useAdminApi() {
  const router = useRouter();
  const { toast } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const call = useCallback(
    async <T = unknown>(url: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown, success?: string): Promise<T | null> => {
      setBusy(true);
      setError(null);
      setFieldErrors({});
      try {
        const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
        const data = (await res.json().catch(() => ({}))) as { error?: string; issues?: { path: string; message: string }[] } & T;
        if (!res.ok) {
          if (data.issues?.length) setFieldErrors(Object.fromEntries(data.issues.map((i) => [i.path, i.message])));
          throw new Error(data.error ?? "Request failed");
        }
        if (success) toast(success);
        router.refresh();
        return data as T;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [router, toast],
  );

  return { call, busy, error, fieldErrors, setError };
}
