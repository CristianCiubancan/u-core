import React, { useCallback, useRef, useState, memo } from 'react';
import { getMaxTexturesForItem } from '../../utils/getClothingImage';
import { ClothingVariationsPopup } from './ClothingVariationsPopup';
import { ClothingImage } from './ClothingImage';
import { useTextureVerification } from '../../hooks';
import { fetchNui } from '../../../../../../../webview/utils/fetchNui';

interface ClothingItemProps {
  model: string;
  componentId: number;
  drawableId: number;
  isSelected: boolean;
  onSelectDrawable: () => void;
}

// Helper function to map component IDs to their respective clothing keys
const getClothingKeyFromComponentId = (componentId: number): string => {
  switch (componentId) {
    case 11:
      return 'tops';
    case 8:
      return 'undershirt';
    case 4:
      return 'legs';
    case 6:
      return 'shoes';
    case 7:
      return 'accessories';
    case 3:
      return 'torso';
    default:
      return 'tops';
  }
};

// Base component implementation
const ClothingItemBase: React.FC<ClothingItemProps> = ({
  model,
  componentId,
  drawableId,
  isSelected,
  onSelectDrawable,
}) => {
  // Refs and UI state
  const itemRef = useRef<HTMLDivElement>(null);
  const [showVariations, setShowVariations] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  // Get the maximum number of textures for this item
  const maxTextures = getMaxTexturesForItem(model, componentId, drawableId);

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

  // Update game character when texture changes
  const updateGameCharacter = useCallback((textureId: number) => {
    if (isSelected) {
      const clothingKey = getClothingKeyFromComponentId(componentId);
      fetchNui('character-create:update-clothing', {
        key: `${clothingKey}Texture`,
        value: textureId,
      }).catch((error: any) => {
        console.error('[UI] Failed to update clothing texture:', error);
      });
    }
  }, [isSelected, componentId]);

  // Handle texture selection
  const handleSelectTexture = useCallback((textureId: number) => {
    selectTexture(textureId);
    updateGameCharacter(textureId);
  }, [selectTexture, updateGameCharacter]);

  // When item becomes selected, update the game with current texture
  React.useEffect(() => {
    if (isSelected) {
      updateGameCharacter(selectedTexture);
    }
  }, [isSelected, selectedTexture, updateGameCharacter]);

  // Handle click on clothing item
  const handleClick = useCallback(() => {
    if (hasVariations && isSelected) {
      // If we haven't verified textures yet, do it now
      if (verifiedTextures.length === 0) {
        verifyAllTextures().then(() => {
          // Only show popup if we actually have variations
          if (verifiedTextures.length > 1) {
            showVariationsPopup();
          }
        });
      } else if (verifiedTextures.length > 1) {
        // We have verified textures, show the popup
        showVariationsPopup();
      }
    } else {
      // Otherwise, select this drawable
      onSelectDrawable();
    }
  }, [
    hasVariations, 
    isSelected, 
    verifiedTextures.length, 
    verifyAllTextures, 
    onSelectDrawable
  ]);

  // Position and show the variations popup
  const showVariationsPopup = useCallback(() => {
    const rect = itemRef.current?.getBoundingClientRect();
    if (rect) {
      setPopupPosition({
        x: rect.left,
        y: rect.bottom + 5,
      });
      setShowVariations(true);
    }
  }, []);

  // Close the variations popup
  const handleCloseVariations = useCallback(() => {
    setShowVariations(false);
  }, []);

  // We'll let the ClothingImage component handle the fallback automatically

  return (
    <div className="relative" style={{ zIndex: showVariations ? 10 : 'auto' }}>
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

      {/* Variations popup */}
      {showVariations && verifiedTextures.length > 1 && (
        <ClothingVariationsPopup
          model={model}
          componentId={componentId}
          drawableId={drawableId}
          verifiedTextures={verifiedTextures}
          selectedTexture={selectedTexture}
          onSelectTexture={handleSelectTexture}
          onClose={handleCloseVariations}
          position={popupPosition}
        />
      )}
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
    prevProps.isSelected === nextProps.isSelected
  );
});
