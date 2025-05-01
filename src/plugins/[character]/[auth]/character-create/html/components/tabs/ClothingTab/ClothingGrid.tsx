import React from 'react';
import {
  ClothingCategory,
  getMaxTexturesForItem,
} from '../../../utils/getClothingImage';
import { ClothingItem } from '../../clothing/ClothingItem';
import { TextureNavigation } from './TextureNavigation';

// ClothingGrid component for each category
interface ClothingGridProps {
  category: ClothingCategory;
  model: string;
  selectedDrawable: number;
  selectedTexture: number;
  onSelectDrawable: (value: number) => void;
  onSelectTexture: (value: number) => void;
}

export const ClothingGrid: React.FC<ClothingGridProps> = ({
  category,
  model,
  selectedDrawable,
  selectedTexture,
  onSelectDrawable,
  onSelectTexture,
}) => {
  // Generate a range of drawable IDs for the grid
  const drawableIds = Array.from({ length: category.maxItems }, (_, i) => i);

  // Get the maximum number of textures for the selected item from variations.json
  const maxTextures = getMaxTexturesForItem(
    model,
    category.componentId,
    selectedDrawable
  );

  // Handle texture navigation
  const handlePreviousTexture = () => {
    const newTexture =
      selectedTexture <= 0 ? maxTextures - 1 : selectedTexture - 1;
    onSelectTexture(newTexture);
  };

  const handleNextTexture = () => {
    const newTexture =
      selectedTexture >= maxTextures - 1 ? 0 : selectedTexture + 1;
    onSelectTexture(newTexture);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Fixed header with styles and texture navigation */}
      <div className="flex justify-between items-center mb-3 flex-shrink-0">
        <div className="flex items-center">
          <h4 className="text-sm font-medium mr-4">Styles</h4>
          <TextureNavigation
            currentTexture={selectedTexture}
            maxTextures={maxTextures}
            onPrevious={handlePreviousTexture}
            onNext={handleNextTexture}
          />
        </div>
        <span className="text-xs text-gray-400">
          Selected: {selectedDrawable}
        </span>
      </div>
      {/* Scrollable grid container */}
      <div className="overflow-y-scroll overflow-x-hidden scrollbar-brand-dark flex-grow">
        {/* Clothing grid with more columns for demonstrating scrolling */}
        <div className="grid grid-cols-4 gap-2 p-2">
          {drawableIds.map((drawableId) => (
            <ClothingItem
              key={`${category.id}-${drawableId}`}
              model={model}
              componentId={category.componentId}
              drawableId={drawableId}
              textureId={selectedTexture}
              isSelected={selectedDrawable === drawableId}
              onSelectDrawable={() => onSelectDrawable(drawableId)}
              onSelectTexture={onSelectTexture}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
