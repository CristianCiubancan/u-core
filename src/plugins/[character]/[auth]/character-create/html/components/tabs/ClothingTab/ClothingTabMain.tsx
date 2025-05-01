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

  // Get the drawable ID for the currently selected category
  const getSelectedDrawable = () => {
    switch (activeCategory) {
      case 'tops':
        return clothingData.tops;
      case 'undershirt':
        return clothingData.undershirt;
      case 'legs':
        return clothingData.legs;
      case 'shoes':
        return clothingData.shoes;
      case 'accessories':
        return clothingData.accessories;
      case 'torso':
        return clothingData.torso;
      default:
        return clothingData.tops;
    }
  };

  const selectedDrawable = getSelectedDrawable();

  // Handle drawable selection
  const handleDrawableSelect = (value: number) => {
    const key = activeCategory;
    // Update the game character
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
            selectedDrawable={selectedDrawable}
            onSelectDrawable={handleDrawableSelect}
          />
        </div>
      </div>
    </TabLayout>
  );
};
