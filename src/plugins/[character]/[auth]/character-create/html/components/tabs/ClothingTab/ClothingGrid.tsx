import React, { useEffect } from 'react';
import { ClothingCategory } from '../../../utils/getClothingImage';
import { ClothingItem } from '../../clothing/ClothingItem';
import { useInfiniteScroll } from '../../../hooks';
import { LoadingIndicator } from '../../common';

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

  // Initialize infinite scroll with a reasonable number of initial items
  const {
    containerRef,
    visibleItems,
    isLoading,
    hasMore,
    loadMore
  } = useInfiniteScroll(drawableIds, 20, 12, 300);

  // Reset scroll when category changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [category.id]);

  // Ensure the selected item is visible
  useEffect(() => {
    if (!visibleItems.includes(selectedDrawable) && selectedDrawable < category.maxItems) {
      // Keep loading until selected item is visible
      loadMore();
    }
  }, [selectedDrawable, visibleItems, category.maxItems, loadMore]);

  return (
    <div className="flex flex-col h-full">
      {/* Fixed header */}
      <div className="flex justify-between items-center mb-3 flex-shrink-0">
        <div className="flex items-center">
          <h4 className="text-sm font-medium mr-4">Styles</h4>
        </div>
        <span className="text-xs text-gray-400">
          Selected: {selectedDrawable} ({visibleItems.length} of {category.maxItems} items loaded)
        </span>
      </div>
      {/* Scrollable grid container */}
      <div 
        ref={containerRef}
        className="overflow-y-scroll overflow-x-hidden scrollbar-brand-dark flex-grow"
      >
        {/* Clothing grid with more columns for demonstrating scrolling */}
        <div className="grid grid-cols-4 gap-2 p-2">
          {visibleItems.map((drawableId) => (
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
        
        {/* Loading indicator at the bottom while loading more items */}
        {isLoading && (
          <div className="w-full py-4 flex justify-center">
            <LoadingIndicator size="medium" />
          </div>
        )}
        
        {/* End of list message when all items are loaded */}
        {!hasMore && !isLoading && visibleItems.length > 0 && (
          <div className="w-full py-4 text-center text-xs text-gray-400">
            All styles loaded
          </div>
        )}
      </div>
    </div>
  );
};
