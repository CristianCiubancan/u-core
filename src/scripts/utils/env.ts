/**
 * Utility functions for working with environment variables
 */

/**
 * Configure environment for resource reloading
 */
export function configureEnvironment(reload: boolean): void {
  if (reload) {
    process.env.RELOADER_ENABLED = 'true';
    process.env.RELOADER_HOST = process.env.RELOADER_HOST || 'localhost';
    process.env.RELOADER_PORT = process.env.RELOADER_PORT || '3414';
    process.env.RELOADER_API_KEY =
      process.env.RELOADER_API_KEY || 'your-secure-api-key';
  } else {
    process.env.RELOADER_ENABLED = 'false';
  }
}
