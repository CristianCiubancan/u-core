/**
 * Utility function to get the clothing image path based on the character model, component ID, and drawable ID
 * Uses the asset server to retrieve optimized images
 *
 * @param model The character model (male/female)
 * @param componentId The clothing component ID
 * @param drawableId The drawable ID (style)
 * @param textureId The texture ID
 * @param quality The image quality level (high, medium, low, tiny)
 * @returns The path to the clothing image
 */
export const getClothingImage = (
  model: string,
  componentId: number,
  drawableId: number,
  textureId: number,
  quality: 'high' | 'medium' | 'low' | 'tiny' = 'medium'
): string => {
  // Determine if male or female
  const gender = model === 'mp_m_freemode_01' ? 'male' : 'female';

  // Map component IDs to their respective clothing types
  // 0: Face
  // 1: Mask
  // 2: Hair
  // 3: Torso
  // 4: Legs
  // 5: Bags
  // 6: Shoes
  // 7: Accessories
  // 8: Undershirt
  // 9: Body Armor
  // 10: Decals
  // 11: Tops

  // Get the asset server URL from environment variables
  const assetServerUrl =
    process.env.ASSET_SERVER_URL || 'http://localhost:3000';

  // Create the image path with texture ID
  const imagePath = `${assetServerUrl}/assets/${quality}/images/clothing/${gender}_${componentId}_${drawableId}_${textureId}.png`;

  // Return the primary path - the component will handle fallback if needed
  return imagePath;
};

/**
 * Get the fallback clothing image path (without texture ID)
 *
 * @param model The character model (male/female)
 * @param componentId The clothing component ID
 * @param drawableId The drawable ID (style)
 * @param quality The image quality level (high, medium, low, tiny)
 * @returns The fallback path to the clothing image
 */
export const getClothingImageFallback = (
  model: string,
  componentId: number,
  drawableId: number,
  quality: 'high' | 'medium' | 'low' | 'tiny' = 'medium'
): string => {
  // Determine if male or female
  const gender = model === 'mp_m_freemode_01' ? 'male' : 'female';

  // Get the asset server URL from environment variables
  const assetServerUrl =
    process.env.ASSET_SERVER_URL || 'http://localhost:3000';

  // Create a fallback path without texture ID
  return `${assetServerUrl}/assets/${quality}/images/clothing/${gender}_${componentId}_${drawableId}.png`;
};

/**
 * Maps clothing keys from the UI to component IDs in FiveM
 *
 * @param key The clothing key from the UI
 * @returns The component ID
 */
export const getComponentIdFromKey = (key: string): number => {
  const componentMap: Record<string, number> = {
    'tops': 11,
    'torso': 3,
    'undershirt': 8,
    'legs': 4,
    'shoes': 6,
    'accessories': 7,
  };

  return componentMap[key] || 11; // Default to tops if not found
};
