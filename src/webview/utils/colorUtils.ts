// colorUtils.ts
export function hexToRgb(hex: string): string {
  return hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((hex) => parseInt(hex, 16))
    .join(", ");
}

/**
 * Hex → "r g b" triplet without commas. shadcn's CSS variable
 * convention so Tailwind opacity modifiers (`bg-primary/50`) can
 * compose into `rgb(var(--primary) / 0.5)`.
 */
export function hexToRgbTriplet(hex: string): string {
  return hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((h) => parseInt(h, 16))
    .join(" ");
}

export function getContrastRatio(color1: string, color2: string): number {
  function getLuminance(hexColor: string): number {
    const rgb = hexColor
      .replace("#", "")
      .match(/.{2}/g)!
      .map((hex) => {
        const value = parseInt(hex, 16) / 255;
        return value <= 0.03928
          ? value / 12.92
          : Math.pow((value + 0.055) / 1.055, 2.4);
      });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);
  const brightest = Math.max(luminance1, luminance2);
  const darkest = Math.min(luminance1, luminance2);

  return (brightest + 0.05) / (darkest + 0.05);
}
