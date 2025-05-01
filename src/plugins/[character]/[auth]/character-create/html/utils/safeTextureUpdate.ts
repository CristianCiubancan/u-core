import { fetchNui } from '../../../../../../webview/utils/fetchNui';
import { verifyTextures } from './textureVerification';

/**
 * Cache to store verification results for quick access
 */
interface VerificationCache {
  [key: string]: {
    textures: number[];
    timestamp: number;
  };
}

// Cache expires after 5 minutes
const CACHE_EXPIRY = 5 * 60 * 1000;

// In-memory cache
const verificationCache: VerificationCache = {};

/**
 * Generate a cache key for a clothing item
 */
const getCacheKey = (
  model: string,
  componentId: number,
  drawableId: number
): string => {
  return `${model}_${componentId}_${drawableId}`;
};

/**
 * Helper function to map component IDs to their respective clothing keys
 */
const getClothingKeyFromComponentId = (componentId: number): string => {
  switch (componentId) {
    case 11:
      return 'tops';
    case 8:
      return 'undershirt';
    case 4:
      return 'legs';
    case 6:
      return 'shoes';
    case 7:
      return 'accessories';
    case 3:
      return 'torso';
    default:
      return 'tops';
  }
};

/**
 * Safely update a texture by verifying it exists before sending to the game
 *
 * @param model The character model
 * @param componentId The clothing component ID
 * @param drawableId The drawable ID (style)
 * @param textureId The texture ID to set
 * @param maxTextures Maximum number of textures to check if not already verified
 * @returns Promise resolving to whether the update was successful
 */
export const safelyUpdateTexture = async (
  model: string,
  componentId: number,
  drawableId: number,
  textureId: number,
  maxTextures: number = 16
): Promise<boolean> => {
  // Get the clothing key for this component
  const clothingKey = getClothingKeyFromComponentId(componentId);
  const cacheKey = getCacheKey(model, componentId, drawableId);

  try {
    // Check cache first
    const cachedResult = verificationCache[cacheKey];

    let verifiedTextures: number[] = [];

    // If we have a valid cached result, use it
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_EXPIRY) {
      verifiedTextures = cachedResult.textures;
    } else {
      // Otherwise, verify textures
      verifiedTextures = await verifyTextures(
        model,
        componentId,
        drawableId,
        maxTextures
      );

      // Store in cache
      verificationCache[cacheKey] = {
        textures: verifiedTextures,
        timestamp: Date.now(),
      };
    }

    // Check if the requested texture is verified
    if (verifiedTextures.includes(textureId)) {
      // It's verified, send the update
      await fetchNui('character-create:update-clothing', {
        key: `${clothingKey}Texture`,
        value: textureId,
      });
      return true;
    } else {
      // Texture doesn't exist, log warning
      console.warn(
        `[Safe Texture Update] Texture ${textureId} not verified for ${model}, component ${componentId}, drawable ${drawableId}`
      );

      // If we have any verified textures, use the first one
      if (verifiedTextures.length > 0) {
        const fallbackTexture = verifiedTextures[0];
        console.log(
          `[Safe Texture Update] Using fallback texture ${fallbackTexture}`
        );
        await fetchNui('character-create:update-clothing', {
          key: `${clothingKey}Texture`,
          value: fallbackTexture,
        });
        return true;
      }

      return false;
    }
  } catch (error) {
    console.error('[Safe Texture Update] Error updating texture:', error);
    return false;
  }
};

/**
 * Wrapper for the clothing update function that ensures safety
 *
 * @param key The clothing key to update
 * @param value The value to set
 * @param model The character model
 * @param componentId Optional component ID (if not provided, will be derived from key)
 * @returns Promise resolving to whether the update was successful
 */
export const safeClothingUpdate = async (
  key: string,
  value: number,
  model: string,
  componentId?: number
): Promise<boolean> => {
  // Check if this is a texture update (key ends with 'Texture')
  if (key.endsWith('Texture')) {
    // Extract the base clothing key (remove 'Texture' suffix)
    const baseKey = key.replace('Texture', '');

    // Get or derive the component ID
    const compId = componentId || getComponentIdFromKey(baseKey);

    // Get the current drawable ID for this component
    // Note: This assumes the clothingData structure is accessible
    // In a real implementation, you'd need to get this from the character state
    const drawableId = await getCurrentDrawableId(baseKey);

    // Safely update the texture
    return safelyUpdateTexture(model, compId, drawableId, value);
  } else {
    // This is a drawable update, not a texture update
    // Send it directly
    await fetchNui('character-create:update-clothing', {
      key,
      value,
    });
    return true;
  }
};

/**
 * Get component ID from clothing key
 */
const getComponentIdFromKey = (key: string): number => {
  switch (key) {
    case 'tops':
      return 11;
    case 'undershirt':
      return 8;
    case 'legs':
      return 4;
    case 'shoes':
      return 6;
    case 'accessories':
      return 7;
    case 'torso':
      return 3;
    default:
      return 11;
  }
};

/**
 * Get the current drawable ID for a clothing component
 * This is a placeholder - in a real implementation, you'd get this from the character state
 */
const getCurrentDrawableId = async (baseKey: string): Promise<number> => {
  // This would need to be implemented to access the current character data
  // For now, we'll use localStorage as a temporary solution
  const storedValue = localStorage.getItem(`character:${baseKey}`);
  return storedValue ? parseInt(storedValue, 10) : 0;
};
