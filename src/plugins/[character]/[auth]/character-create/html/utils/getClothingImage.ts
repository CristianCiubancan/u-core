import React from 'react';

/**
 * Utility function to get the clothing image path based on the character model, component ID, drawable ID, and texture ID
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
  textureId: number = 0,
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
    process.env.ASSET_SERVER_URL || 'http://localhost:3000'; // Corrected protocol to http

  // Determine if this is a prop (componentIds 0, 1, 2, 6, 7 are props)
  const isProp = [0, 1, 2].includes(componentId);

  // Create the image path with texture ID
  const imagePath = isProp
    ? `${assetServerUrl}/assets/${quality}/${gender}_prop_${componentId}_${drawableId}_${textureId}.png`
    : `${assetServerUrl}/assets/${quality}/${gender}_${componentId}_${drawableId}_${textureId}.png`;

  // Return the path
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
    process.env.ASSET_SERVER_URL || 'http://localhost:3000'; // Corrected protocol to http

  // Determine if this is a prop (componentIds 0, 1, 2, 6, 7 are props)
  const isProp = [0, 1, 2].includes(componentId);

  // Create a fallback path without texture ID
  return isProp
    ? `${assetServerUrl}/assets/${quality}/${gender}_prop_${componentId}_${drawableId}_0.png`
    : `${assetServerUrl}/assets/${quality}/${gender}_${componentId}_${drawableId}_0.png`;
};

/**
 * Get the thumbnail image path for a clothing item
 *
 * @param model The character model (male/female)
 * @param componentId The clothing component ID
 * @param drawableId The drawable ID (style)
 * @param textureId The texture ID
 * @param quality The image quality level (high, medium, low, tiny)
 * @returns The path to the clothing thumbnail image
 */
export const getClothingThumbnail = (
  model: string,
  componentId: number,
  drawableId: number,
  textureId: number = 0,
  quality: 'high' | 'medium' | 'low' | 'tiny' = 'medium'
): string => {
  // Determine if male or female
  const gender = model === 'mp_m_freemode_01' ? 'male' : 'female';

  // Get the asset server URL from environment variables
  const assetServerUrl =
    process.env.ASSET_SERVER_URL || 'http://localhost:3000';

  // Determine if this is a prop (componentIds 0, 1, 2, 6, 7 are props)
  const isProp = [0, 1, 2].includes(componentId);

  // Create the thumbnail path with texture ID
  const thumbnailPath = isProp
    ? `${assetServerUrl}/thumbnails/${quality}/${gender}_prop_${componentId}_${drawableId}_${textureId}.png`
    : `${assetServerUrl}/thumbnails/${quality}/${gender}_${componentId}_${drawableId}_${textureId}.png`;

  // Return the path
  return thumbnailPath;
};

/**
 * Get the fallback thumbnail image path (without texture ID)
 *
 * @param model The character model (male/female)
 * @param componentId The clothing component ID
 * @param drawableId The drawable ID (style)
 * @param quality The image quality level (high, medium, low, tiny)
 * @returns The fallback path to the clothing thumbnail image
 */
export const getClothingThumbnailFallback = (
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

  // Determine if this is a prop (componentIds 0, 1, 2, 6, 7 are props)
  const isProp = [0, 1, 2].includes(componentId);

  // Create a fallback thumbnail path without texture ID
  return isProp
    ? `${assetServerUrl}/thumbnails/${quality}/${gender}_prop_${componentId}_${drawableId}_0.png`
    : `${assetServerUrl}/thumbnails/${quality}/${gender}_${componentId}_${drawableId}_0.png`;
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

// Import variations data
import variationsData from '../../shared/variations.json';

// Define types for the variations data structure
type VariationsType = {
  male: {
    CLOTHING: {
      [componentId: string]: {
        [drawableId: string]: number;
      };
    };
    PROPS: {
      [componentId: string]: {
        [drawableId: string]: number;
      };
    };
  };
  female: {
    CLOTHING: {
      [componentId: string]: {
        [drawableId: string]: number;
      };
    };
    PROPS: {
      [componentId: string]: {
        [drawableId: string]: number;
      };
    };
  };
};

// Define a type for clothing category
export type ClothingCategory = {
  id: string;
  label: string;
  componentId: number;
  maxItems: number;
  icon: React.ReactNode;
};

// Cast the imported data to our defined type
const typedVariationsData = variationsData as VariationsType;

/**
 * Get the maximum number of textures for a specific clothing item
 *
 * @param model The character model (male/female)
 * @param componentId The clothing component ID
 * @param drawableId The drawable ID (style)
 * @returns The maximum number of textures available for this item
 */
export const getMaxTexturesForItem = (
  model: string,
  componentId: number,
  drawableId: number
): number => {
  // Determine if male or female
  const gender = model === 'mp_m_freemode_01' ? 'male' : 'female';

  // Determine if this is a prop or clothing
  const category = [0, 1, 2].includes(componentId) ? 'PROPS' : 'CLOTHING';

  try {
    // Convert numeric IDs to strings for object access
    const componentIdStr = componentId.toString();
    const drawableIdStr = drawableId.toString();

    // Access the variations data
    const variations = typedVariationsData[gender][category];

    // Get the textures for this component and drawable
    if (
      variations &&
      variations[componentIdStr] &&
      variations[componentIdStr][drawableIdStr]
    ) {
      return variations[componentIdStr][drawableIdStr];
    }

    // Default to 1 if not found
    return 1;
  } catch (error) {
    console.error('Error getting max textures:', error);
    return 1; // Default to 1 texture if there's an error
  }
};

/**
 * Get the maximum number of clothing items for a specific component
 *
 * @param model The character model (male/female)
 * @param componentId The clothing component ID
 * @returns The maximum number of items available for this component
 */
export const getMaxItemsForComponent = (
  model: string,
  componentId: number
): number => {
  // Determine if male or female
  const gender = model === 'mp_m_freemode_01' ? 'male' : 'female';

  // Determine if this is a prop or clothing
  const category = [0, 1, 2].includes(componentId) ? 'PROPS' : 'CLOTHING';

  try {
    // Convert numeric ID to string for object access
    const componentIdStr = componentId.toString();

    // Access the variations data
    const variations = typedVariationsData[gender][category];

    // If the component exists in variations
    if (variations && variations[componentIdStr]) {
      // Get the highest drawable ID by finding the maximum key value
      const drawableIds = Object.keys(variations[componentIdStr])
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));

      if (drawableIds.length > 0) {
        return Math.max(...drawableIds) + 1; // +1 because we need the count, not the max index
      }
    }

    // Default values if not found in variations
    const defaultMaxItems: Record<number, number> = {
      3: 40, // Torso
      4: 45, // Legs
      6: 35, // Shoes
      7: 30, // Accessories
      8: 40, // Undershirt
      11: 50, // Tops
    };

    return defaultMaxItems[componentId] || 30; // Default to 30 if not found
  } catch (error) {
    console.error('Error getting max items:', error);
    return 30; // Default to 30 items if there's an error
  }
};
