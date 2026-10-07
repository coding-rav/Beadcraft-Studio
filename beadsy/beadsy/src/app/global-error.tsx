"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#fdf7ee", color: "#3a2749" }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
          <div>
            <h1 style={{ fontSize: 32, margin: 0 }}>Beadsy hit a snag</h1>
            <p style={{ color: "#6e5f7a" }}>Something unexpected happened. Please try again.</p>
            <button
              onClick={reset}
              style={{ background: "#6b4a82", color: "#fff", border: 0, borderRadius: 999, padding: "12px 28px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
