import { getClothingThumbnail } from './getClothingImage';

/**
 * Cache to store verification results to avoid repeated checks
 * Format: `${model}_${componentId}_${drawableId}` -> number[] (array of verified texture IDs)
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
const getCacheKey = (model: string, componentId: number, drawableId: number): string => {
  return `${model}_${componentId}_${drawableId}`;
};

/**
 * Check if a specific texture exists by attempting to load its image
 * @param model Character model
 * @param componentId Clothing component ID
 * @param drawableId Drawable ID (style)
 * @param textureId Texture ID to verify
 * @returns Promise that resolves to true if texture exists, false otherwise
 */
export const checkTextureExists = (
  model: string,
  componentId: number,
  drawableId: number,
  textureId: number
): Promise<boolean> => {
  return new Promise((resolve) => {
    // Use tiny quality for faster loading during verification
    const quality = 'tiny';
    
    // Get the thumbnail path
    const path = getClothingThumbnail(
      model,
      componentId,
      drawableId,
      textureId,
      quality
    );
    
    // Try to load the image
    const img = new Image();
    
    // Set a timeout to avoid hanging
    const timeout = setTimeout(() => {
      console.log(`[Texture Verification] Timeout checking texture ${textureId}`);
      resolve(false);
    }, 2000);
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    
    img.src = path;
  });
};

/**
 * Verify which textures actually exist for a clothing item
 * @param model Character model
 * @param componentId Clothing component ID
 * @param drawableId Drawable ID (style)
 * @param maxTextures Maximum number of textures to check
 * @returns Promise that resolves to an array of verified texture IDs
 */
export const verifyTextures = async (
  model: string,
  componentId: number,
  drawableId: number,
  maxTextures: number
): Promise<number[]> => {
  // Check cache first
  const cacheKey = getCacheKey(model, componentId, drawableId);
  const cachedResult = verificationCache[cacheKey];
  
  // If we have a valid cached result, return it
  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_EXPIRY) {
    console.log(`[Texture Verification] Using cached result for ${cacheKey}`);
    return cachedResult.textures;
  }
  
  console.log(`[Texture Verification] Verifying textures for ${cacheKey}, max: ${maxTextures}`);
  
  // If maxTextures is 1, we can assume texture 0 exists
  if (maxTextures <= 1) {
    const textures = [0];
    // Store in cache
    verificationCache[cacheKey] = {
      textures,
      timestamp: Date.now()
    };
    return textures;
  }
  
  // Verify all textures in parallel
  const verificationPromises = Array.from({ length: maxTextures }, (_, i) => 
    checkTextureExists(model, componentId, drawableId, i)
  );
  
  // Wait for all promises to resolve
  const results = await Promise.all(verificationPromises);
  
  // Filter out textures that don't exist
  const verifiedTextures = results
    .map((exists, index) => ({ exists, index }))
    .filter(item => item.exists)
    .map(item => item.index);
  
  // If no textures verified, at least include texture 0
  if (verifiedTextures.length === 0) {
    verifiedTextures.push(0);
  }
  
  // Store in cache
  verificationCache[cacheKey] = {
    textures: verifiedTextures,
    timestamp: Date.now()
  };
  
  console.log(`[Texture Verification] Verified textures for ${cacheKey}:`, verifiedTextures);
  
  return verifiedTextures;
};

/**
 * Quickly check if an item has variations without verifying each one
 * This performs faster initial checks to show variation indicators
 * @param model Character model
 * @param componentId Clothing component ID
 * @param drawableId Drawable ID (style)
 * @returns Promise resolving to whether item likely has variations
 */
export const quickCheckHasVariations = async (
  model: string,
  componentId: number,
  drawableId: number
): Promise<boolean> => {
  // Check cache first
  const cacheKey = getCacheKey(model, componentId, drawableId);
  const cachedResult = verificationCache[cacheKey];
  
  // If cached, use that result
  if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_EXPIRY) {
    return cachedResult.textures.length > 1;
  }
  
  // Check if texture 1 exists (we assume 0 exists)
  const hasTexture1 = await checkTextureExists(model, componentId, drawableId, 1);
  
  return hasTexture1;
};

/**
 * Get the next valid texture ID from verified textures
 * @param currentTexture Current texture ID
 * @param verifiedTextures Array of verified texture IDs
 * @returns Next valid texture ID
 */
export const getNextValidTexture = (
  currentTexture: number,
  verifiedTextures: number[]
): number => {
  if (verifiedTextures.length <= 1) return verifiedTextures[0] || 0;
  
  // Find the index of current texture
  const currentIndex = verifiedTextures.indexOf(currentTexture);
  
  // If not found, return first texture
  if (currentIndex === -1) return verifiedTextures[0];
  
  // Return next texture, wrapping around if needed
  return verifiedTextures[(currentIndex + 1) % verifiedTextures.length];
};

/**
 * Get the previous valid texture ID from verified textures
 * @param currentTexture Current texture ID
 * @param verifiedTextures Array of verified texture IDs
 * @returns Previous valid texture ID
 */
export const getPreviousValidTexture = (
  currentTexture: number,
  verifiedTextures: number[]
): number => {
  if (verifiedTextures.length <= 1) return verifiedTextures[0] || 0;
  
  // Find the index of current texture
  const currentIndex = verifiedTextures.indexOf(currentTexture);
  
  // If not found, return last texture
  if (currentIndex === -1) return verifiedTextures[verifiedTextures.length - 1];
  
  // Return previous texture, wrapping around if needed
  return verifiedTextures[(currentIndex - 1 + verifiedTextures.length) % verifiedTextures.length];
};