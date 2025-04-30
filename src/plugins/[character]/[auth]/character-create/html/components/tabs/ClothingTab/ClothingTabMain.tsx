import React, { useState } from 'react';
import { CharacterData } from '../../../../shared/types';
import { TabLayout } from '../../common';
import { ClothingCategoryButton } from './ClothingCategoryButton';
import { ClothingGrid } from './ClothingGrid';
import { createClothingCategories } from './ClothingCategories';

interface ClothingTabProps {
  clothingData: CharacterData['clothing'];
  onClothingChange: (key: string, value: number) => void;
  model: string;
}

export const ClothingTabMain: React.FC<ClothingTabProps> = ({
  clothingData,
  onClothingChange,
  model,
}) => {
  // State to track which clothing category is currently active
  const [activeCategory, setActiveCategory] = useState<string>('tops');

  // Create clothing categories based on the current model
  const clothingCategories = createClothingCategories(model);

  // Function to handle clicking on a clothing category
  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
  };

  // Get the drawable ID and texture ID for the currently selected category
  const getDrawableAndTexture = () => {
    switch (activeCategory) {
      case 'tops':
        return {
          drawableId: clothingData.tops,
          textureId: clothingData.topsTexture,
        };
      case 'undershirt':
        return {
          drawableId: clothingData.undershirt,
          textureId: clothingData.undershirtTexture,
        };
      case 'legs':
        return {
          drawableId: clothingData.legs,
          textureId: clothingData.legsTexture,
        };
      case 'shoes':
        return {
          drawableId: clothingData.shoes,
          textureId: clothingData.shoesTexture,
        };
      case 'accessories':
        return {
          drawableId: clothingData.accessories,
          textureId: clothingData.accessoriesTexture,
        };
      case 'torso':
        return {
          drawableId: clothingData.torso,
          textureId: clothingData.torsoTexture,
        };
      default:
        return {
          drawableId: clothingData.tops,
          textureId: clothingData.topsTexture,
        };
    }
  };

  const { drawableId, textureId } = getDrawableAndTexture();

  // Handle drawable selection
  const handleDrawableSelect = (value: number) => {
    const key = activeCategory;

    // Update the game character
    onClothingChange(key, value);
  };

  // Handle texture selection
  const handleTextureSelect = (value: number) => {
    // This is only used for texture navigation in the main UI
    // For variations popup, we directly update the game without using this
    const key = `${activeCategory}Texture`;
    onClothingChange(key, value);
  };

  // Find the current active category object
  const currentCategory =
    clothingCategories.find((cat) => cat.id === activeCategory) ||
    clothingCategories[0];

  return (
    <TabLayout title="Clothing Customization">
      <div className="flex flex-col gap-4 h-full">
        {/* Category selection - horizontal tabs (fixed) */}
        <div className="grid grid-cols-6 gap-2 pb-3 border-b border-brand-800/30 mb-3 flex-shrink-0">
          {clothingCategories.map((category) => (
            <ClothingCategoryButton
              key={category.id}
              id={category.id}
              activeCategory={activeCategory}
              label={category.label}
              icon={category.icon}
              onClick={handleCategorySelect}
            />
          ))}
        </div>

        {/* Clothing grid container - takes remaining height */}
        <div className="w-full flex-grow flex flex-col min-h-0 max-h-[calc(100vh-300px)]">
          <ClothingGrid
            category={currentCategory}
            model={model}
            selectedDrawable={drawableId}
            selectedTexture={textureId}
            onSelectDrawable={handleDrawableSelect}
            onSelectTexture={handleTextureSelect}
          />
        </div>
      </div>
    </TabLayout>
  );
};
