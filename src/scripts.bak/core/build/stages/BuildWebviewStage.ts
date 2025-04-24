/**
 * Build webview stage
 */
import { BuildContext } from '../../types.js';
import { WebviewBuilderImpl } from '../WebviewBuilder.js';

/**
 * Build webview
 * @param context Build context
 */
export async function buildWebviewStage(context: BuildContext): Promise<void> {
  const { distDir, logger } = context;

  logger.info('Building webview...');

  try {
    // Get plugins from context
    const plugins = [
      ...((context as any).plugins || []),
      ...((context as any).corePlugins || []),
    ];

    // Create webview builder
    const webviewBuilder = new WebviewBuilderImpl(undefined, logger);

    // Build webview for each plugin
    await webviewBuilder.buildWebview(plugins, distDir);

    logger.info('Webview built successfully');
  } catch (error) {
    logger.error('Error building webview:', error);
    throw error;
  }
}
