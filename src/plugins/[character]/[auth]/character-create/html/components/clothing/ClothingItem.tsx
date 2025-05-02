import React, { useCallback, useRef, memo, useEffect } from 'react';
import { getMaxTexturesForItem } from '../../utils/getClothingImage';
import { ClothingImage } from './ClothingImage';
import { useTextureVerification } from '../../hooks';
import { useCharacterData } from '../../context/CharacterDataContext';

// Global cache to persist texture selections across tab navigations
const textureSelectionCache = new Map<string, number>();

interface ClothingItemProps {
  model: string;
  componentId: number;
  drawableId: number;
  isSelected: boolean;
  initialTexture?: number;
  onSelectDrawable: () => void;
}

// Base component implementation
const ClothingItemBase: React.FC<ClothingItemProps> = ({
  model,
  componentId,
  drawableId,
  isSelected,
  initialTexture = 0,
  onSelectDrawable,
}) => {
  // Refs
  const itemRef = useRef<HTMLDivElement>(null);

  // Get context functions
  const { setSelectedClothingItem, setIsVerifyingTextures } =
    useCharacterData();

  // Get the maximum number of textures for this item
  const maxTextures = getMaxTexturesForItem(model, componentId, drawableId);

  // Create a unique ID for this clothing item to use in the cache
  const cacheKey = `${model}-${componentId}-${drawableId}`;

  // Use our texture verification hook
  const {
    selectedTexture,
    hasVariations,
    verifiedTextures,
    selectTexture,
    verifyAllTextures,
  } = useTextureVerification(model, componentId, drawableId, maxTextures, {
    // Auto-verify textures when the item is selected
    autoVerify: isSelected,
  });

  // Initialize from cache or props, when the component mounts
  useEffect(() => {
    // If we have a value from the cache, use that
    if (textureSelectionCache.has(cacheKey)) {
      const cachedTexture = textureSelectionCache.get(cacheKey) || 0;
      selectTexture(cachedTexture);
    }
    // Otherwise, use initialTexture if it's provided and non-zero
    else if (initialTexture > 0) {
      selectTexture(initialTexture);
      textureSelectionCache.set(cacheKey, initialTexture);
    }
  }, [cacheKey, initialTexture, selectTexture]);

  // When item becomes selected, update the selected clothing item in context
  React.useEffect(() => {
    if (isSelected && hasVariations && verifiedTextures.length > 0) {
      setSelectedClothingItem({
        componentId,
        drawableId,
        verifiedTextures,
        selectedTexture,
      });
    }
  }, [
    isSelected,
    hasVariations,
    verifiedTextures,
    selectedTexture,
    componentId,
    drawableId,
    setSelectedClothingItem,
  ]);

  // Handle click on clothing item
  const handleClick = useCallback(() => {
    if (hasVariations && isSelected) {
      // If we haven't verified textures yet, do it now
      if (verifiedTextures.length === 0) {
        setIsVerifyingTextures(true);
        verifyAllTextures().then(() => {
          // Set the selected clothing item in the context with the updated verified textures
          setSelectedClothingItem({
            componentId,
            drawableId,
            verifiedTextures,
            selectedTexture,
          });
          setIsVerifyingTextures(false);
        });
      } else if (verifiedTextures.length > 1) {
        // We have verified textures, update the context
        setSelectedClothingItem({
          componentId,
          drawableId,
          verifiedTextures,
          selectedTexture,
        });
      }
    } else {
      // Otherwise, select this drawable
      onSelectDrawable();

      // Clear the selected clothing item when selecting a new item
      if (!isSelected) {
        setSelectedClothingItem(null);
      }
    }
  }, [
    hasVariations,
    isSelected,
    verifiedTextures,
    selectedTexture,
    verifyAllTextures,
    onSelectDrawable,
    setSelectedClothingItem,
    setIsVerifyingTextures,
    componentId,
    drawableId,
  ]);

  // We'll let the ClothingImage component handle the fallback automatically

  return (
    <div className="relative">
      <div
        ref={itemRef}
        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'ring-2 ring-brand-500 scale-105 glass-brand-dark'
            : 'hover:scale-105 glass-dark'
        }`}
        onClick={handleClick}
      >
        <ClothingImage
          model={model}
          componentId={componentId}
          drawableId={drawableId}
          textureId={selectedTexture}
          quality="low"
        />

        {/* Indicator for items with variations */}
        {hasVariations && (
          <div
            className="absolute top-1 right-1 w-4 h-4 bg-brand-500 rounded-full"
            title="This item has multiple variations"
          />
        )}

        {/* Indicator for selected texture */}
        {selectedTexture > 0 && (
          <div
            className="absolute bottom-1 right-1 text-xs bg-brand-500/80 rounded-full w-5 h-5 flex items-center justify-center"
            title={`Texture ${selectedTexture} selected`}
          >
            {selectedTexture}
          </div>
        )}
      </div>
    </div>
  );
};

// Memoized version of the component that only re-renders when props change
// This significantly improves performance when rendering many items
export const ClothingItem = memo(ClothingItemBase, (prevProps, nextProps) => {
  // Only re-render if any of these props change
  return (
    prevProps.model === nextProps.model &&
    prevProps.componentId === nextProps.componentId &&
    prevProps.drawableId === nextProps.drawableId &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.initialTexture === nextProps.initialTexture
  );
});
