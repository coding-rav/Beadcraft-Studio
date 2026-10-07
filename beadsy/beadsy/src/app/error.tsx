"use client";

import { useEffect } from "react";
import { StatePanel } from "@/components/ui/States";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[ui] route error", error.digest ?? error.message);
  }, [error]);
  return (
    <StatePanel
      art="charm"
      tone="pink"
      title="Oh no, a bead rolled away"
      message="Something went wrong on our side. Give it another try — and if it keeps happening, please let us know."
      actions={[
        { label: "Try again", onClick: reset },
        { label: "Back to home", href: "/", variant: "secondary" },
      ]}
    >
      {error.digest && <p className="mt-3 text-xs text-muted">Reference: {error.digest}</p>}
    </StatePanel>
  );
}
