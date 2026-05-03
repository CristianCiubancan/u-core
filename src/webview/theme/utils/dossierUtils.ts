import { hexToRgb } from '../../utils/colorUtils';
import type { grayPalettes, colorPalettes } from '../colors';

type GrayPalette = (typeof grayPalettes)[keyof typeof grayPalettes];
type ColorPalette = (typeof colorPalettes)[keyof typeof colorPalettes];

/**
 * Dossier design language — translucent paper cards, hairline-underline
 * inputs, mono uppercase labels, text+icon action buttons. Generated
 * against the active grayPalette + brandPalette so swapping
 * `appConfig.brandColor` / `appConfig.grayColor` flexes the entire
 * dossier UI alongside the rest of the theme.
 *
 * Wired via the `addComponents` Tailwind plugin in tailwind.config.ts;
 * components have lower CSS specificity than utilities, so consumer
 * plugins can still override individual properties with `bg-…` /
 * `border-…` etc. without `!important` shenanigans.
 *
 * Hardcoded `red-…` values come from Tailwind's stock red palette —
 * "danger" is universally red and shouldn't follow brand. The
 * destructive surfaces also stay visually consistent across themes.
 */

const FONT_DISPLAY = '"Fraunces", Georgia, serif';
const FONT_SERIF = '"Libre Baskerville", Georgia, serif';
const FONT_MONO =
  '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

// Tailwind 'red-300/400/500' equivalents — fixed to maintain a clear
// "destructive" signal regardless of theme palette swaps.
const RED_200 = 'rgb(254, 202, 202)';
const RED_300 = 'rgb(252, 165, 165)';
const RED_400 = 'rgb(248, 113, 113)';
const RED_500_60 = 'rgba(239, 68, 68, 0.6)';
const RED_500_50 = 'rgba(239, 68, 68, 0.5)';
const RED_500_40 = 'rgba(239, 68, 68, 0.4)';

export function generateDossierComponents(
  grayPalette: GrayPalette,
  brandPalette: ColorPalette
): Record<string, Record<string, unknown>> {
  const grayRgb = (n: keyof GrayPalette) => hexToRgb(grayPalette[n]);
  const brandRgb = (n: keyof ColorPalette) => hexToRgb(brandPalette[n]);

  return {
    // Translucent paper card — base building block.
    // No drop shadow: the dossier vocabulary deliberately avoids them.
    // A 32px-blur shadow extends ~40px past the element's box on every
    // side, which the eye reads as ghost padding around the paper —
    // most visible on the *last* paper in a column where there's no
    // sibling to absorb the halo. The hairline border + backdrop-blur
    // already give enough separation from the live game scene.
    // FiveM's CEF build does not reliably render `backdrop-filter`
    // (the frosted-glass effect was being silently dropped), so the
    // paper relies purely on `rgba()` alpha to be translucent. The
    // alpha sits between 0.5 and 0.7 — high enough that body text
    // stays legible against busy in-game scenes, low enough that the
    // world clearly shows through. If the bg ever needs more frost,
    // re-introduce backdrop-filter behind a feature query, not as a
    // baseline.
    '.dossier-paper': {
      position: 'relative',
      backgroundColor: `rgba(${grayRgb(950)}, 0.85)`,
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: `rgba(${grayRgb(800)}, 0.6)`,
    },

    // Selected variant — indigo accent rail + slightly stronger fill.
    // Drop shadow removed for the same reason as `.dossier-paper`; the
    // inset rail alone carries the "selected" cue.
    '.dossier-paper-selected': {
      borderColor: `rgba(${brandRgb(500)}, 0.6)`,
      backgroundColor: `rgba(${grayRgb(900)}, 0.7)`,
      boxShadow: `inset 2px 0 0 0 rgba(${brandRgb(500)}, 0.9)`,
    },

    // Field label — small mono uppercase, matches section meta-text.
    '.dossier-label': {
      display: 'block',
      fontFamily: FONT_MONO,
      fontSize: '9px',
      letterSpacing: '0.35em',
      textTransform: 'uppercase',
      color: grayPalette[400],
    },

    // Field input — hairline bottom border, no fill, indigo on focus.
    '.dossier-input': {
      width: '100%',
      backgroundColor: 'transparent',
      borderWidth: '0',
      borderStyle: 'solid',
      borderBottomWidth: '1px',
      borderBottomColor: `rgba(${grayRgb(700)}, 0.7)`,
      paddingTop: '6px',
      paddingBottom: '6px',
      paddingLeft: '4px',
      paddingRight: '4px',
      color: grayPalette[100],
      fontFamily: FONT_SERIF,
      fontSize: '14px',
      lineHeight: '1.375',
      transitionProperty: 'border-color',
      transitionDuration: '150ms',
      '&::placeholder': {
        color: grayPalette[600],
      },
      '&:focus': {
        outline: 'none',
        borderBottomColor: brandPalette[400],
      },
    },

    '.dossier-input-error': {
      borderBottomColor: RED_500_60,
      '&:focus': {
        borderBottomColor: RED_400,
      },
    },

    // Inline error caption shown beneath a field.
    '.dossier-error': {
      marginTop: '4px',
      fontFamily: FONT_MONO,
      fontSize: '9px',
      letterSpacing: '0.2em',
      color: RED_400,
      textTransform: 'uppercase',
    },

    // Text + icon action button. Hairline-underlined affordance.
    '.dossier-action': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      paddingLeft: '12px',
      paddingRight: '12px',
      paddingTop: '6px',
      paddingBottom: '6px',
      borderTopWidth: '0',
      borderRightWidth: '0',
      borderLeftWidth: '0',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: grayPalette[700],
      color: grayPalette[300],
      transitionProperty: 'color, border-color',
      transitionDuration: '150ms',
      fontFamily: FONT_MONO,
      fontSize: '9.5px',
      letterSpacing: '0.25em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      '&:hover': {
        color: grayPalette[100],
        borderBottomColor: grayPalette[500],
      },
    },

    '.dossier-action-accent': {
      color: brandPalette[300],
      borderBottomColor: `rgba(${brandRgb(500)}, 0.5)`,
      '&:hover': {
        color: brandPalette[200],
        borderBottomColor: brandPalette[400],
      },
    },

    '.dossier-action-danger': {
      color: RED_300,
      borderBottomColor: RED_500_40,
      '&:hover': {
        color: RED_200,
        borderBottomColor: RED_400,
      },
    },

    // Floating-text section header — used above paper stacks. The text
    // shadow keeps it legible against bright in-game surfaces.
    '.dossier-section-meta': {
      fontFamily: FONT_MONO,
      fontSize: '9px',
      letterSpacing: '0.35em',
      textTransform: 'uppercase',
      color: grayPalette[300],
      textShadow: '0 1px 4px rgba(0, 0, 0, 0.85)',
    },

    '.dossier-section-title': {
      fontFamily: FONT_DISPLAY,
      fontSize: '1.125rem',
      fontWeight: '300',
      color: grayPalette[100],
      textShadow: '0 1px 4px rgba(0, 0, 0, 0.85)',
    },
  };

  // Reference to silence "unused" lint since RED_500_50 is exported only
  // for completeness alongside other red shades.
  void RED_500_50;
}
