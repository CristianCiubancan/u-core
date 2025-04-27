import {
  createScrollbarStyles,
  ScrollbarStyles,
} from '../../utils/scrollbarUtils'; // Import ScrollbarStyles
import { hexToRgb } from '../../utils/colorUtils';
import { grayPalettes, colorPalettes } from '../colors';

interface ScrollbarConfig {
  trackBg: string;
  thumbBg: string;
  thumbBorder: string;
  thumbHoverBg: string;
}

interface GlassStyles {
  background: string;
  border: string;
  'box-shadow': string;
  'border-radius': string;
  // Explicitly include scrollbar style properties instead of index signature
  '&::-webkit-scrollbar'?: ScrollbarStyles['&::-webkit-scrollbar'];
  '&::-webkit-scrollbar-track'?: ScrollbarStyles['&::-webkit-scrollbar-track'];
  '&::-webkit-scrollbar-thumb'?: ScrollbarStyles['&::-webkit-scrollbar-thumb'];
  '&::-webkit-scrollbar-thumb:hover'?: ScrollbarStyles['&::-webkit-scrollbar-thumb:hover'];
}

// Function to generate glass class styles
function createGlassStyles(
  background: string,
  border: string,
  boxShadow: string,
  scrollbarConfig: ScrollbarConfig
): GlassStyles {
  return {
    background,
    border,
    'box-shadow': boxShadow,
    'border-radius': '0.65rem', // Increased for better visual appearance
    ...createScrollbarStyles(
      scrollbarConfig.trackBg,
      scrollbarConfig.thumbBg,
      scrollbarConfig.thumbBorder,
      scrollbarConfig.thumbHoverBg
    ),
  };
}

// Function to generate merged glass classes with the active brand color and matching scrollbars
function generateMergedGlassClasses(
  grayPalette: (typeof grayPalettes)[keyof typeof grayPalettes],
  brandPalette: (typeof colorPalettes)[keyof typeof colorPalettes]
): { [key: string]: GlassStyles } {
  const lightText: string = grayPalette[50];
  const darkText: string = grayPalette[800];

  const glassBaseStyles = {
    'border-radius': '0.65rem',
  };

  const createGlassVariantStyles = (
    bgColor: string,
    borderColor: string,
    boxShadowColor: string,
    scrollbarConfig: ScrollbarConfig,
    textColor: string
  ) => ({
    ...createGlassStyles(bgColor, borderColor, boxShadowColor, scrollbarConfig),
    color: textColor,
    ...glassBaseStyles,
  });

  return {
    '.glass': createGlassVariantStyles(
      `rgba(${hexToRgb(grayPalette[50])}, 0.25)`,
      `1px solid rgba(${hexToRgb(grayPalette[200])}, 0.3)`,
      `0 4px 30px rgba(${hexToRgb(grayPalette[900])}, 0.15)`,
      {
        trackBg: `rgba(${hexToRgb(grayPalette[100])}, 0.2)`,
        thumbBg: `rgba(${hexToRgb(grayPalette[300])}, 0.3)`,
        thumbBorder: `2px solid rgba(${hexToRgb(grayPalette[200])}, 0.2)`,
        thumbHoverBg: `rgba(${hexToRgb(grayPalette[400])}, 0.4)`,
      },
      darkText
    ),
    '.glass-dark': createGlassVariantStyles(
      `rgba(${hexToRgb(grayPalette[900])}, 0.7)`,
      `1px solid rgba(${hexToRgb(grayPalette[700])}, 0.2)`,
      `0 6px 32px rgba(${hexToRgb(grayPalette[900])}, 0.25)`,
      {
        trackBg: `rgba(${hexToRgb(grayPalette[800])}, 0.4)`,
        thumbBg: `rgba(${hexToRgb(grayPalette[600])}, 0.6)`,
        thumbBorder: `2px solid rgba(${hexToRgb(grayPalette[700])}, 0.3)`,
        thumbHoverBg: `rgba(${hexToRgb(grayPalette[500])}, 0.7)`,
      },
      lightText
    ),
    '.glass-brand': createGlassVariantStyles(
      `rgba(${hexToRgb(brandPalette[50])}, 0.6)`,
      `1px solid rgba(${hexToRgb(brandPalette[200])}, 0.4)`,
      `0 6px 30px rgba(${hexToRgb(brandPalette[500])}, 0.15)`,
      {
        trackBg: `rgba(${hexToRgb(brandPalette[100])}, 0.3)`,
        thumbBg: `rgba(${hexToRgb(brandPalette[400])}, 0.5)`,
        thumbBorder: `2px solid rgba(${hexToRgb(brandPalette[300])}, 0.3)`,
        thumbHoverBg: `rgba(${hexToRgb(brandPalette[500])}, 0.6)`,
      },
      darkText
    ),
    '.glass-brand-dark': createGlassVariantStyles(
      `rgba(${hexToRgb(brandPalette[800])}, 0.8)`,
      `1px solid rgba(${hexToRgb(brandPalette[600])}, 0.5)`,
      `0 8px 36px rgba(${hexToRgb(brandPalette[900])}, 0.3)`,
      {
        trackBg: `rgba(${hexToRgb(brandPalette[700])}, 0.4)`,
        thumbBg: `rgba(${hexToRgb(brandPalette[400])}, 0.7)`,
        thumbBorder: `2px solid rgba(${hexToRgb(grayPalette[500])}, 0.5)`,
        thumbHoverBg: `rgba(${hexToRgb(brandPalette[300])}, 0.8)`,
      },
      lightText
    ),
  };
}

export { generateMergedGlassClasses };
