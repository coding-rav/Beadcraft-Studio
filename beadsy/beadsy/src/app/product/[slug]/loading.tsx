export default function Loading() {
  return (
    <div className="container-x grid gap-10 py-10 lg:grid-cols-[1.1fr_1fr]" aria-busy="true" aria-label="Loading product">
      <div className="skeleton aspect-square rounded-3xl" />
      <div className="space-y-4">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-10 w-3/4" />
        <div className="skeleton h-5 w-40" />
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-12 w-full" />
      </div>
    </div>
  );
}
