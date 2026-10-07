/** Swatch colours for the colour filter. Keys are lowercase colour names stored on products. */
export const COLOR_HEX: Record<string, string> = {
  pink: "#F58FB0",
  rose: "#E8688F",
  red: "#D9534F",
  coral: "#E8837F",
  orange: "#F4A261",
  yellow: "#F8D26B",
  gold: "#D4A82C",
  green: "#98C99A",
  mint: "#BFE0C0",
  blue: "#8EC3E6",
  sky: "#9CCBEA",
  purple: "#9B79AE",
  lavender: "#C5A9DB",
  white: "#FFFFFF",
  black: "#2B2233",
  multicolor: "linear-gradient(135deg,#F58FB0,#F8D26B,#98C99A,#9B79AE)",
  rainbow: "linear-gradient(135deg,#F58FB0,#F8D26B,#98C99A,#8EC3E6,#9B79AE)",
  pastel: "linear-gradient(135deg,#FDE4EC,#FEF3CD,#E1F2E2,#EDE3F4)",
};

export function colorSwatch(name: string): string {
  return COLOR_HEX[name.toLowerCase()] ?? "#DCCAEA";
}
