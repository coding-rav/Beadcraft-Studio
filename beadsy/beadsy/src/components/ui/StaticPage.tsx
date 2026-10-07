import type { ReactNode } from "react";

export function StaticPage({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <article className="container-x max-w-3xl py-10 sm:py-16">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="text-4xl font-semibold sm:text-5xl">{title}</h1>
      {intro && <p className="mt-3 text-lg text-plum-800">{intro}</p>}
      <div className="prose-beadsy mt-8">{children}</div>
    </article>
  );
}
