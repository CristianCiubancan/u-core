import React from 'react';
import { ClothingCategory } from '../../../utils/getClothingImage';
import { ClothingItem } from '../../clothing/ClothingItem';

// ClothingGrid component for each category
interface ClothingGridProps {
  category: ClothingCategory;
  model: string;
  selectedDrawable: number;
  onSelectDrawable: (value: number) => void;
}

export const ClothingGrid: React.FC<ClothingGridProps> = ({
  category,
  model,
  selectedDrawable,
  onSelectDrawable,
}) => {
  // Generate a range of drawable IDs for the grid
  const drawableIds = Array.from({ length: category.maxItems }, (_, i) => i);

  return (
    <div className="flex flex-col h-full">
      {/* Fixed header */}
      <div className="flex justify-between items-center mb-3 flex-shrink-0">
        <div className="flex items-center">
          <h4 className="text-sm font-medium mr-4">Styles</h4>
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
              isSelected={selectedDrawable === drawableId}
              onSelectDrawable={() => onSelectDrawable(drawableId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
