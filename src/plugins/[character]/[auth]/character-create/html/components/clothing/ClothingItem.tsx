import React, { useState, useEffect, useRef } from 'react';
import {
  getClothingThumbnail,
  getClothingThumbnailFallback,
  getMaxTexturesForItem,
} from '../../utils/getClothingImage';
import { ClothingVariationsPopup } from './ClothingVariationsPopup';
import Spinner from '../../../../../../../webview/components/ui/Spinner';

interface ClothingItemProps {
  model: string;
  componentId: number;
  drawableId: number;
  textureId: number;
  isSelected: boolean;
  onSelectDrawable: () => void;
  onSelectTexture: (textureId: number) => void;
}

export const ClothingItem: React.FC<ClothingItemProps> = ({
  model,
  componentId,
  drawableId,
  textureId,
  isSelected,
  onSelectDrawable,
  onSelectTexture,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imagePath, setImagePath] = useState('');
  const [showVariations, setShowVariations] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const itemRef = useRef<HTMLDivElement>(null);

  // Get the maximum number of textures for this item
  const maxTextures = getMaxTexturesForItem(model, componentId, drawableId);

  // Determine if this item has multiple textures
  const hasVariations = maxTextures > 1;

  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    // Reset states when props change
    setImageLoaded(false);
    setLoadFailed(false);

    // Always use tiny quality for thumbnails
    const quality = 'low';

    // Get the thumbnail path from the asset server with texture ID
    const path = getClothingThumbnail(
      model,
      componentId,
      drawableId,
      textureId,
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
  }, [model, componentId, drawableId, textureId]);

  const handleClick = () => {
    if (hasVariations && isSelected) {
      // If already selected and has variations, show the variations popup
      const rect = itemRef.current?.getBoundingClientRect();
      if (rect) {
        // Position the popup near the clicked item
        setPopupPosition({
          x: rect.left,
          y: rect.bottom + 5, // 5px below the item
        });
        setShowVariations(true);
      }
    } else {
      // Otherwise, select this drawable
      onSelectDrawable();
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
      </div>

      {/* Variations popup */}
      {showVariations && (
        <ClothingVariationsPopup
          model={model}
          componentId={componentId}
          drawableId={drawableId}
          maxTextures={maxTextures}
          selectedTexture={textureId}
          onSelectTexture={onSelectTexture}
          onClose={handleCloseVariations}
          position={popupPosition}
        />
      )}
    </>
  );
};
