import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ClothingImage } from './ClothingImage';

interface ClothingVariationsPopupProps {
  model: string;
  componentId: number;
  drawableId: number;
  verifiedTextures: number[];
  selectedTexture: number;
  onSelectTexture: (textureId: number) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

export const ClothingVariationsPopup: React.FC<ClothingVariationsPopupProps> = ({
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

  // Adjust position to keep popup within viewport
  useEffect(() => {
    if (!popupRef.current) return;
    
    const rect = popupRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = position.x;
    let newY = position.y;

    // Adjust horizontal position
    if (newX + rect.width > viewportWidth) {
      newX = Math.max(10, newX - rect.width / 2);
    }
    
    // Don't go off left edge
    newX = Math.max(10, newX);

    // Adjust vertical position
    if (newY + rect.height > viewportHeight) {
      newY = Math.max(10, position.y - rect.height - 10);
    }

    setAdjustedPosition({ x: newX, y: newY });
  }, [position]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Safety check for empty textures array
  useEffect(() => {
    if (verifiedTextures.length === 0) {
      console.warn('No verified textures available, closing popup');
      onClose();
    }
  }, [verifiedTextures, onClose]);

  const handleSelectVariation = useCallback((textureId: number) => {
    onSelectTexture(textureId);
    onClose();
  }, [onSelectTexture, onClose]);

  // Sort textures numerically
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
              onClick={() => handleSelectVariation(textureId)}
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
  // Construct fallback path
  const fallbackSrc = `/assets/clothing/${model}/${componentId}/${drawableId}/0_tiny.png`;

  return (
    <div
      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-brand-500 scale-105'
          : 'hover:scale-105 hover:ring-1 hover:ring-brand-300'
      }`}
      onClick={onClick}
    >
      <ClothingImage
        model={model}
        componentId={componentId}
        drawableId={drawableId}
        textureId={textureId}
        quality="tiny"
        fallbackSrc={fallbackSrc}
      />
    </div>
  );
};
