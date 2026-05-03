import { hexToRgbTriplet } from '../../utils/colorUtils';
import type { grayPalettes, colorPalettes } from '../colors';

type GrayPalette = (typeof grayPalettes)[keyof typeof grayPalettes];
type ColorPalette = (typeof colorPalettes)[keyof typeof colorPalettes];

/**
 * shadcn-style CSS variable tokens derived from the active palette.
 *
 * shadcn components reference colors as `bg-primary`, `text-foreground`,
 * etc. — those resolve through Tailwind's color tokens to
 * `rgb(var(--primary) / <alpha-value>)`. Centralizing the generation
 * here means swapping `appConfig.brandColor` from `indigo` → `emerald`
 * (or `grayColor` from `zinc` → `slate`) re-emits every token in lock
 * step.
 *
 * Tokens follow the shadcn defaults so off-the-shelf component code
 * works without modification — only their values are wired to our
 * dossier theme.
 *
 * Variables are emitted as space-separated `r g b` triplets per the
 * Tailwind opacity-modifier contract.
 */
export function generateShadcnTokens(
  grayPalette: GrayPalette,
  brandPalette: ColorPalette
): Record<string, Record<string, string>> {
  const gray = (n: keyof GrayPalette) => hexToRgbTriplet(grayPalette[n]);
  const brand = (n: keyof ColorPalette) => hexToRgbTriplet(brandPalette[n]);

  // Destructive tone fixed to Tailwind's stock red regardless of theme —
  // "delete" / "void" should not change hue with the brand color.
  const RED_500 = '239 68 68';
  const WHITE = '255 255 255';

  return {
    ':root': {
      // Surfaces
      '--background': gray(950),
      '--foreground': gray(100),
      '--card': gray(950),
      '--card-foreground': gray(100),
      '--popover': gray(950),
      '--popover-foreground': gray(100),

      // Brand / primary
      '--primary': brand(500),
      '--primary-foreground': gray(50),

      // Secondary surface (subtle, matches dossier paper alt)
      '--secondary': gray(800),
      '--secondary-foreground': gray(100),

      // Muted (for placeholder text, disabled states, meta)
      '--muted': gray(800),
      '--muted-foreground': gray(400),

      // Accent (hover surfaces inside menus, etc.)
      '--accent': gray(800),
      '--accent-foreground': gray(50),

      // Destructive (delete / void)
      '--destructive': RED_500,
      '--destructive-foreground': WHITE,

      // Borders + form ring
      '--border': gray(800),
      '--input': gray(700),
      '--ring': brand(400),

      // shadcn radius default — dossier is sharper, so 0.125rem (2px)
      '--radius': '0.125rem',
    },
  };
}
