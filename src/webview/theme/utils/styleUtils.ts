// src/webview/theme/utils/styleUtils.ts

import { hexToRgb } from './colorUtils';
import { scrollbars, borders } from '../tokens/constants';

/**
 * Glass effect configuration
 */
export interface GlassConfig {
  background: string;
  border: string;
  shadowColor: string;
  shadowOpacity: number;
  borderRadius: string;
  backdropBlur?: string;
}

/**
 * Creates glass effect styles with optimized properties
 * @param config - Glass effect configuration
 * @returns Object with CSS properties for glass effect
 */
export function createGlassStyles(config: GlassConfig) {
  const {
    background,
    border,
    shadowColor,
    shadowOpacity,
    borderRadius,
    backdropBlur = '12px',
  } = config;

  const rgbShadowColor = hexToRgb(shadowColor);

  return {
    'background': background,
    'backdrop-filter': `blur(${backdropBlur})`,
    '-webkit-backdrop-filter': `blur(${backdropBlur})`,
    'border': `${borders.width.thin} solid ${border}`,
    'border-radius': borderRadius,
    'box-shadow': `0 8px 32px rgba(${rgbShadowColor}, ${shadowOpacity})`,
  };
}

/**
 * Scrollbar configuration
 */
export interface ScrollbarConfig {
  width?: string;
  trackColor?: string;
  thumbColor?: string;
  thumbHoverColor?: string;
  borderRadius?: string;
}

/**
 * Creates custom scrollbar styles
 * @param config - Scrollbar configuration
 * @returns Object with CSS properties for custom scrollbar
 */
export function createScrollbarStyles(config: ScrollbarConfig) {
  const {
    width = scrollbars.width.default,
    trackColor = 'transparent',
    thumbColor = 'rgba(100, 116, 139, 0.5)',
    thumbHoverColor = 'rgba(100, 116, 139, 0.7)',
    borderRadius = scrollbars.borderRadius.default,
  } = config;

  return {
    // Firefox
    'scrollbar-width': 'thin',
    'scrollbar-color': `${thumbColor} ${trackColor}`,

    // Webkit/Blink
    '&::-webkit-scrollbar': {
      width,
      height: width,
    },
    '&::-webkit-scrollbar-track': {
      background: trackColor,
    },
    '&::-webkit-scrollbar-thumb': {
      background: thumbColor,
      'border-radius': borderRadius,
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: thumbHoverColor,
    },
  };
}
