import { Icon } from "./Icon";

export function Stars({ rating, size = 16, className = "" }: { rating: number; size?: number; className?: string }) {
  const full = Math.round(rating * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} role="img" aria-label={`Rated ${rating.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className="relative inline-block" style={{ width: size, height: size }}>
          <Icon name="star" size={size} className="absolute inset-0 text-plum-200" filled />
          <span className="absolute inset-0 overflow-hidden" style={{ width: full >= n ? "100%" : full >= n - 0.5 ? "50%" : "0%" }}>
            <Icon name="star" size={size} className="text-sun-500" filled />
          </span>
        </span>
      ))}
    </span>
  );
}
