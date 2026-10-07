import type { ArtKind } from "@/lib/types";

/**
 * Generated bead artwork — used wherever a product has no photograph yet, and for
 * decorative illustrations. Deterministic: the same seed always draws the same piece.
 * Pure SVG, no ids/gradients, so it is safe in server components and cheap to render.
 */

function rng(seed: number) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
  return [parseInt(v.slice(0, 2), 16) || 0, parseInt(v.slice(2, 4), 16) || 0, parseInt(v.slice(4, 6), 16) || 0];
}
function mix(hex: string, other: string, t: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  const c = a.map((x, i) => Math.round(x + (b[i]! - x) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
const darker = (hex: string, t = 0.22) => mix(hex, "#3A2749", t);
const lighter = (hex: string, t = 0.6) => mix(hex, "#FFFFFF", t);

function Bead({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} />
      <circle cx={x} cy={y} r={r - r * 0.06} fill="none" stroke={darker(color)} strokeWidth={r * 0.12} opacity={0.55} />
      <ellipse cx={x - r * 0.32} cy={y - r * 0.36} rx={r * 0.3} ry={r * 0.18} fill="#fff" opacity={0.6} transform={`rotate(-35 ${x - r * 0.32} ${y - r * 0.36})`} />
      <circle cx={x + r * 0.35} cy={y + r * 0.4} r={r * 0.09} fill="#fff" opacity={0.35} />
    </g>
  );
}

function Flower({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  const petals = [0, 1, 2, 3, 4].map((i) => {
    const a = (-90 + 72 * i) * (Math.PI / 180);
    return { px: x + Math.cos(a) * r * 0.62, py: y + Math.sin(a) * r * 0.62 };
  });
  return (
    <g>
      {petals.map((p, i) => (
        <circle key={i} cx={p.px} cy={p.py} r={r * 0.46} fill={color} stroke={darker(color)} strokeWidth={r * 0.07} strokeOpacity={0.5} />
      ))}
      <circle cx={x} cy={y} r={r * 0.4} fill={color} />
      <circle cx={x} cy={y} r={r * 0.2} fill="#fff" />
      <ellipse cx={x - r * 0.35} cy={y - r * 0.7} rx={r * 0.16} ry={r * 0.09} fill="#fff" opacity={0.6} />
    </g>
  );
}

function Heart({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return (
    <path
      transform={`translate(${x - 12 * s} ${y - 12 * s}) scale(${s})`}
      d="M12 21s-7.5-4.6-9.5-9.2C1.1 8.6 3 5 6.4 5c2 0 3.5 1.1 4.3 2.5L12 9l1.3-1.5C14.1 6.1 15.6 5 17.6 5 21 5 22.9 8.6 21.5 11.8 19.5 16.4 12 21 12 21z"
      fill={color}
      stroke={darker(color)}
      strokeWidth={1}
      strokeOpacity={0.5}
    />
  );
}

function Sparkle({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -10 C1 -3 3 -1 10 0 C3 1 1 3 0 10 C-1 3 -3 1 -10 0 C-3 -1 -1 -3 0 -10Z"
      fill={color}
      opacity={0.85}
    />
  );
}

interface Props {
  kind: ArtKind;
  palette: string[];
  seed?: number;
  label?: string;
  className?: string;
  /** hide the soft background tile (for decorative use on coloured surfaces) */
  bare?: boolean;
}

export function BeadArt({ kind, palette, seed = 1, label, className, bare = false }: Props) {
  const rand = rng(seed + 11);
  const pal = palette.length ? palette : ["#F58FB0", "#F8D26B", "#9B79AE", "#98C99A"];
  const pick = (i: number) => pal[i % pal.length]!;
  const bg = mix(pal[0]!, "#FDF7EE", 0.84);
  const bg2 = mix(pal[Math.min(1, pal.length - 1)]!, "#FDF7EE", 0.8);
  const thread = "#9B79AE";
  const nodes: React.ReactNode[] = [];

  const ring = (cx: number, cy: number, rx: number, ry: number, n: number, r: number, offset: number, keyPrefix: string, flowerEvery = 0) => {
    nodes.push(<ellipse key={`${keyPrefix}-t`} cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={thread} strokeWidth={2.5} opacity={0.65} />);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      const c = pick(i + offset);
      nodes.push(
        flowerEvery && i % flowerEvery === 0 ? (
          <Flower key={`${keyPrefix}-${i}`} x={x} y={y} r={r * 1.25} color={c} />
        ) : (
          <Bead key={`${keyPrefix}-${i}`} x={x} y={y} r={r * (0.92 + rand() * 0.16)} color={c} />
        ),
      );
    }
  };

  const rot = Math.round(rand() * 40 - 20);

  switch (kind) {
    case "necklace": {
      const P0 = [70, 60], P1 = [200, 340], P2 = [330, 60];
      const pt = (t: number) => [
        (1 - t) ** 2 * P0[0]! + 2 * (1 - t) * t * P1[0]! + t * t * P2[0]!,
        (1 - t) ** 2 * P0[1]! + 2 * (1 - t) * t * P1[1]! + t * t * P2[1]!,
      ];
      nodes.push(<path key="chain" d={`M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`} fill="none" stroke={thread} strokeWidth={2.5} opacity={0.65} />);
      const n = 19;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        if (i === Math.round(n / 2)) continue;
        const [x, y] = pt(t);
        nodes.push(<Bead key={i} x={x!} y={y!} r={8 + 8 * Math.sin(Math.PI * t)} color={pick(i)} />);
      }
      const [mx, my] = pt(0.5);
      nodes.push(<Flower key="focal" x={mx!} y={my! + 4} r={34} color={pick(2)} />);
      nodes.push(<Heart key="h" x={mx!} y={my! + 62} s={1.5} color={pick(0)} />);
      break;
    }
    case "keychain": {
      nodes.push(<circle key="ring" cx={200} cy={70} r={32} fill="none" stroke="#B9A5C6" strokeWidth={7} />);
      nodes.push(<circle key="ring2" cx={200} cy={70} r={32} fill="none" stroke="#fff" strokeWidth={2} opacity={0.5} strokeDasharray="30 170" />);
      nodes.push(<line key="line" x1={200} y1={100} x2={200} y2={285} stroke={thread} strokeWidth={2.5} opacity={0.65} />);
      for (let i = 0; i < 6; i++) nodes.push(<Bead key={i} x={200} y={122 + i * 28} r={i % 2 ? 11 : 13} color={pick(i)} />);
      nodes.push(<Flower key="f" x={200} y={310} r={30} color={pick(2)} />);
      for (let i = 0; i < 7; i++) {
        nodes.push(<line key={`tas${i}`} x1={200 + (i - 3) * 3} y1={338} x2={200 + (i - 3) * 8} y2={378} stroke={pick(i)} strokeWidth={4} strokeLinecap="round" />);
      }
      break;
    }
    case "charm": {
      ring(200, 200, 118, 118, 12, 15, 1, "halo");
      nodes.push(<Flower key="big" x={200} y={200} r={86} color={pick(0)} />);
      nodes.push(<Heart key="heart" x={200} y={200} s={1.9} color={pick(1)} />);
      break;
    }
    case "anklet": {
      nodes.push(
        <g key="rotg" transform={`rotate(${rot} 200 190)`}>
          {(() => {
            const out: React.ReactNode[] = [];
            const n = 24;
            out.push(<ellipse key="t" cx={200} cy={180} rx={130} ry={72} fill="none" stroke={thread} strokeWidth={2.5} opacity={0.65} />);
            for (let i = 0; i < n; i++) {
              const a = (i / n) * Math.PI * 2;
              out.push(<Bead key={i} x={200 + Math.cos(a) * 130} y={180 + Math.sin(a) * 72} r={9 + (Math.sin(a) > 0.3 ? 2 : 0)} color={pick(i)} />);
            }
            return out;
          })()}
        </g>,
      );
      [-1, 0, 1].forEach((d, i) => {
        nodes.push(<line key={`l${i}`} x1={200 + d * 34} y1={252} x2={200 + d * 34} y2={286} stroke={thread} strokeWidth={2} opacity={0.65} />);
        nodes.push(<Bead key={`c${i}`} x={200 + d * 34} y={296} r={11} color={pick(i + 1)} />);
      });
      nodes.push(<Heart key="heart" x={200} y={344} s={1.2} color={pick(0)} />);
      break;
    }
    case "giftset": {
      ring(135, 150, 62, 62, 13, 11, 0, "a", 6);
      ring(265, 150, 62, 62, 13, 11, 2, "b", 6);
      ring(200, 272, 62, 62, 13, 11, 4, "c", 6);
      break;
    }
    default: {
      // bracelet
      nodes.push(
        <g key="rotg" transform={`rotate(${rot} 200 200)`}>
          {(() => {
            const out: React.ReactNode[] = [];
            const n = 21;
            const R = 112;
            out.push(<circle key="t" cx={200} cy={200} r={R} fill="none" stroke={thread} strokeWidth={2.5} opacity={0.65} />);
            for (let i = 0; i < n; i++) {
              const a = (i / n) * Math.PI * 2 - Math.PI / 2;
              const x = 200 + Math.cos(a) * R;
              const y = 200 + Math.sin(a) * R;
              out.push(
                i % 7 === 0 ? (
                  <Flower key={i} x={x} y={y} r={27} color={pick(i / 7 + 2)} />
                ) : (
                  <Bead key={i} x={x} y={y} r={16.5 + rand() * 2.5} color={pick(i)} />
                ),
              );
            }
            return out;
          })()}
        </g>,
      );
    }
  }

  return (
    <svg
      viewBox="0 0 400 400"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      preserveAspectRatio="xMidYMid slice"
      style={{ display: "block", width: "100%", height: "100%" }}
    >
      {!bare && <rect width="400" height="400" fill={bg} />}
      {!bare && <circle cx="330" cy="70" r="130" fill={bg2} opacity={0.55} />}
      {!bare && <ellipse cx="200" cy="372" rx="120" ry="9" fill="#523765" opacity={0.08} />}
      {nodes}
      <Sparkle x={52} y={64} s={1.1} color={pick(1)} />
      <Sparkle x={352} y={330} s={0.9} color={pick(0)} />
      <Sparkle x={344} y={150} s={0.6} color={pick(3)} />
    </svg>
  );
}
