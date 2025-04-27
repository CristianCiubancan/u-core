// src/webview/theme/utils/errorUtils.ts

/**
 * Error types for theme system
 */
export enum ErrorType {
  COLOR = 'COLOR',
  TOKEN = 'TOKEN',
  STYLE = 'STYLE',
  COMPONENT = 'COMPONENT',
}

/**
 * Standardized error handler for theme system
 * @param type - Type of error
 * @param message - Error message
 * @param fallback - Fallback value to return
 * @param errorDetails - Additional error details (optional)
 * @returns Fallback value
 */
export function handleThemeError<T>(
  type: ErrorType,
  message: string,
  fallback: T,
  errorDetails?: any
): T {
  // Log with consistent formatting
  console.error(`[Theme System] ${type} Error: ${message}`, errorDetails || '');
  
  // Return fallback value
  return fallback;
}
