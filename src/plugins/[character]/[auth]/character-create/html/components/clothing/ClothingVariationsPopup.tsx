import React, { useState, useEffect, useRef } from 'react';
import {
  getClothingThumbnail,
  getClothingThumbnailFallback,
} from '../../utils/getClothingImage';
import Spinner from '../../../../../../../webview/components/ui/Spinner';

interface ClothingVariationsPopupProps {
  model: string;
  componentId: number;
  drawableId: number;
  verifiedTextures: number[]; // Array of verified texture IDs
  selectedTexture: number;
  onSelectTexture: (textureId: number) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

export const ClothingVariationsPopup: React.FC<
  ClothingVariationsPopupProps
> = ({
  model,
  componentId,
  drawableId,
  verifiedTextures,
  selectedTexture,
  onSelectTexture,
  onClose,
  position,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to ensure popup stays within viewport
  useEffect(() => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x;
      let newY = position.y;

      // Adjust horizontal position if needed
      if (newX + rect.width > viewportWidth) {
        newX = viewportWidth - rect.width - 10;
      }

      // Adjust vertical position if needed
      if (newY + rect.height > viewportHeight) {
        newY = viewportHeight - rect.height - 10;
      }

      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position, popupRef]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Safety check - if we have no textures, close the popup
  useEffect(() => {
    if (verifiedTextures.length === 0) {
      console.warn('No verified textures available, closing popup');
      onClose();
    }
  }, [verifiedTextures, onClose]);

  // Sort the textures to ensure they appear in a logical order
  const sortedTextures = [...verifiedTextures].sort((a, b) => a - b);

  return (
    <div
      ref={popupRef}
      className="fixed z-50 glass-brand-dark p-3 rounded-lg shadow-lg"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      <div className="flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium">Variations</h4>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 max-w-[240px]">
          {sortedTextures.map((textureId) => (
            <TextureVariationItem
              key={textureId}
              model={model}
              componentId={componentId}
              drawableId={drawableId}
              textureId={textureId}
              isSelected={textureId === selectedTexture}
              onClick={() => {
                // Update the parent component's state through the callback
                onSelectTexture(textureId);
                
                // Close the popup after selection
                onClose();
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface TextureVariationItemProps {
  model: string;
  componentId: number;
  drawableId: number;
  textureId: number;
  isSelected: boolean;
  onClick: () => void;
}

const TextureVariationItem: React.FC<TextureVariationItemProps> = ({
  model,
  componentId,
  drawableId,
  textureId,
  isSelected,
  onClick,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imagePath, setImagePath] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    // Reset states when props change
    setImageLoaded(false);
    setLoadFailed(false);

    // Always use tiny quality for variations thumbnails
    const quality = 'tiny';

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

  return (
    <div
      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-brand-500 scale-105'
          : 'hover:scale-105 hover:ring-1 hover:ring-brand-300'
      }`}
      onClick={onClick}
    >
      {imageLoaded ? (
        <img
          src={imagePath}
          alt={`Texture ${textureId}`}
          className="w-full h-full object-cover"
        />
      ) : loadFailed ? (
        <div className="w-full h-full flex items-center justify-center bg-black/30">
          <span className="text-xs text-center">{textureId}</span>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black/30">
          <Spinner size="sm" color="brand" />
        </div>
      )}
    </div>
  );
};
