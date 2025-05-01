import React, { useState, useEffect, useRef } from 'react';
import {
  getClothingThumbnail,
  getClothingThumbnailFallback,
  getMaxTexturesForItem,
} from '../../utils/getClothingImage';
import { 
  quickCheckHasVariations,
  verifyTextures 
} from '../../utils/textureVerification';
import { ClothingVariationsPopup } from './ClothingVariationsPopup';
import Spinner from '../../../../../../../webview/components/ui/Spinner';
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
    case 11: return 'tops';
    case 8: return 'undershirt';
    case 4: return 'legs';
    case 6: return 'shoes';
    case 7: return 'accessories';
    case 3: return 'torso';
    default: return 'tops';
  }
};

export const ClothingItem: React.FC<ClothingItemProps> = ({
  model,
  componentId,
  drawableId,
  isSelected,
  onSelectDrawable,
}) => {
  // Each item maintains its own local texture state
  const [selectedTexture, setSelectedTexture] = useState<number>(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imagePath, setImagePath] = useState('');
  const [showVariations, setShowVariations] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const itemRef = useRef<HTMLDivElement>(null);

  // Get the maximum number of textures for this item
  const maxTextures = getMaxTexturesForItem(model, componentId, drawableId);

  // State for variation detection
  const [variationsChecked, setVariationsChecked] = useState(false);
  const [hasVariations, setHasVariations] = useState(false);
  const [verifiedTextures, setVerifiedTextures] = useState<number[]>([]);
  
  const [loadFailed, setLoadFailed] = useState(false);

  // Handle texture selection internally
  const handleSelectTexture = (textureId: number) => {
    // Update the local state
    setSelectedTexture(textureId);
    
    // Only update the game character if this item is currently selected
    if (isSelected) {
      const clothingKey = getClothingKeyFromComponentId(componentId);
      fetchNui('character-create:update-clothing', {
        key: `${clothingKey}Texture`,
        value: textureId,
      }).catch((error: any) => {
        console.error('[UI] Failed to update clothing texture:', error);
      });
    }
  };

  // When an item becomes selected, update the game with its stored texture
  useEffect(() => {
    if (isSelected) {
      // Update the game character with this item's selected texture
      const clothingKey = getClothingKeyFromComponentId(componentId);
      fetchNui('character-create:update-clothing', {
        key: `${clothingKey}Texture`,
        value: selectedTexture,
      }).catch((error: any) => {
        console.error('[UI] Failed to update clothing texture on selection:', error);
      });
    }
  }, [isSelected, componentId, selectedTexture]);

  // Effect to load the clothing image
  useEffect(() => {
    // Reset states when props change
    setImageLoaded(false);
    setLoadFailed(false);

    // Always use low quality for grid thumbnails
    const quality = 'low';

    // Get the thumbnail path from the asset server with texture ID
    const path = getClothingThumbnail(
      model,
      componentId,
      drawableId,
      selectedTexture,
      quality
    );
    setImagePath(path);

    // Preload the image
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setLoadFailed(false);
    };
    img.onerror = () => {
      // Try fallback with texture ID 0
      const fallbackPath = getClothingThumbnailFallback(
        model,
        componentId,
        drawableId,
        quality
      );
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        setImageLoaded(true);
        setLoadFailed(false);
        setImagePath(fallbackPath);
      };
      fallbackImg.onerror = () => {
        setImageLoaded(false);
        setLoadFailed(true);
      };
      fallbackImg.src = fallbackPath;
    };
    img.src = path;
  }, [model, componentId, drawableId, selectedTexture]);

  // Reset variations check and texture selection when drawable ID changes
  useEffect(() => {
    setVariationsChecked(false);
    setHasVariations(false);
    setVerifiedTextures([]);
    // Reset texture selection to 0 when the drawableId changes
    setSelectedTexture(0);
  }, [drawableId]);

  // Quick check for variations after initial render
  useEffect(() => {
    if (!variationsChecked && maxTextures > 1) {
      // First quickly check if item might have variations
      quickCheckHasVariations(model, componentId, drawableId).then(
        (mightHaveVariations) => {
          setHasVariations(mightHaveVariations);
          setVariationsChecked(true);
        }
      );
    }
  }, [model, componentId, drawableId, maxTextures, variationsChecked]);

  // Full verification when item is selected
  useEffect(() => {
    if (isSelected && hasVariations && verifiedTextures.length === 0) {
      // Perform full verification of all textures
      verifyTextures(model, componentId, drawableId, maxTextures).then(
        (textures) => {
          setVerifiedTextures(textures);
          // Update hasVariations based on verified results
          setHasVariations(textures.length > 1);
          
          // If the current texture isn't in the verified list, reset to first valid texture
          if (textures.length > 0 && !textures.includes(selectedTexture)) {
            setSelectedTexture(textures[0]);
          }
        }
      );
    }
  }, [isSelected, hasVariations, model, componentId, drawableId, maxTextures, verifiedTextures.length, selectedTexture]);

  const handleClick = () => {
    if (hasVariations && isSelected) {
      // If we haven't verified textures yet, do it now
      if (verifiedTextures.length === 0) {
        verifyTextures(model, componentId, drawableId, maxTextures).then(
          (textures) => {
            setVerifiedTextures(textures);
            // Only show popup if we actually have variations
            if (textures.length > 1) {
              showVariationsPopup();
            } else {
              // No variations after all, update state
              setHasVariations(false);
            }
          }
        );
      } else if (verifiedTextures.length > 1) {
        // We have verified textures, show the popup
        showVariationsPopup();
      }
    } else {
      // Otherwise, select this drawable
      onSelectDrawable();
    }
  };

  const showVariationsPopup = () => {
    const rect = itemRef.current?.getBoundingClientRect();
    if (rect) {
      // Position the popup near the clicked item
      setPopupPosition({
        x: rect.left,
        y: rect.bottom + 5, // 5px below the item
      });
      setShowVariations(true);
    }
  };

  const handleCloseVariations = () => {
    setShowVariations(false);
  };

  return (
    <>
      <div
        ref={itemRef}
        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'ring-2 ring-brand-500 scale-105 glass-brand-dark'
            : 'hover:scale-105 glass-dark'
        }`}
        onClick={handleClick}
      >
        {imageLoaded ? (
          <img
            src={imagePath}
            alt={`Clothing item ${drawableId}`}
            className="w-full h-full object-cover"
          />
        ) : loadFailed ? (
          <div className="w-full h-full flex items-center justify-center flex-col">
            <span className="text-xs text-center">{drawableId}</span>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Spinner size="sm" color="brand" />
          </div>
        )}

        {/* Indicator for items with variations */}
        {hasVariations && (
          <div
            className="absolute top-1 right-1 w-4 h-4 bg-brand-500 rounded-full"
            title="This item has multiple variations"
          ></div>
        )}
        
        {/* Small indicator for selected texture if it's not the default */}
        {selectedTexture > 0 && (
          <div
            className="absolute bottom-1 right-1 text-xs bg-brand-500/80 rounded-full w-5 h-5 flex items-center justify-center"
            title={`Texture ${selectedTexture} selected`}
          >
            {selectedTexture}
          </div>
        )}
      </div>

      {/* Variations popup - only show if we have verified textures */}
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
    </>
  );
};
