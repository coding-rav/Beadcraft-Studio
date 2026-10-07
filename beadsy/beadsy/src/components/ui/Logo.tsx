import Image from "next/image";
import Link from "next/link";

/** The supplied Beadsy logo. `variant="full"` includes the tagline. */
export function Logo({
  variant = "wordmark",
  className = "",
  priority = false,
  link = true,
}: {
  variant?: "wordmark" | "full";
  className?: string;
  priority?: boolean;
  link?: boolean;
}) {
  const full = variant === "full";
  const img = (
    <Image
      src={full ? "/brand/logo-full.png" : "/brand/logo-wordmark.png"}
      alt="Beadsy — Small Beads. Big Vibes."
      width={full ? 1000 : 720}
      height={full ? 588 : 361}
      priority={priority}
      sizes={full ? "(max-width: 640px) 70vw, 420px" : "(max-width: 640px) 120px, 170px"}
      className={`h-auto w-full mix-blend-multiply ${className}`}
    />
  );
  if (!link) return img;
  return (
    <Link href="/" aria-label="Beadsy — home" className="block">
      {img}
    </Link>
  );
}
