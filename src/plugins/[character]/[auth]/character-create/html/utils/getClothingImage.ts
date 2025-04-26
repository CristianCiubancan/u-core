/**
 * Utility function to get the clothing image path based on the character model, component ID, and drawable ID
 *
 * @param model The character model (male/female)
 * @param componentId The clothing component ID
 * @param drawableId The drawable ID (style)
 * @param textureId The texture ID
 * @returns The path to the clothing image
 */
export const getClothingImage = (
  model: string,
  componentId: number,
  drawableId: number,
  textureId: number
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

  try {
    // Create the image path using import.meta.url for proper asset referencing
    // First try with the texture ID included
    const imagePath = new URL(
      `../assets/images/clothing/${gender}_${componentId}_${drawableId}_${textureId}.png`,
      import.meta.url
    ).href;

    // The component will handle fallback if the image doesn't exist
    return imagePath;
  } catch (error) {
    // If there's an error with the URL construction, try a fallback without texture
    try {
      const fallbackPath = new URL(
        `../assets/images/clothing/${gender}_${componentId}_${drawableId}.png`,
        import.meta.url
      ).href;
      return fallbackPath;
    } catch (fallbackError) {
      console.error('Error loading clothing image:', fallbackError);
      return '';
    }
  }
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
