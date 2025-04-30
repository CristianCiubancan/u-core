import React, { useState, useEffect } from 'react';
import {
  getClothingThumbnail,
  getClothingThumbnailFallback,
  getComponentIdFromKey,
} from '../utils/getClothingImage';

interface ClothingPreviewProps {
  model: string;
  clothingKey: string;
  drawableId: number;
  textureId: number;
}

export const ClothingPreview: React.FC<ClothingPreviewProps> = ({
  model,
  clothingKey,
  drawableId,
  textureId,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imagePath, setImagePath] = useState('');
  const [fallbackPath, setFallbackPath] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);
  const componentId = getComponentIdFromKey(clothingKey);

  useEffect(() => {
    // Reset image loaded state when props change
    setImageLoaded(false);
    setUsingFallback(false);

    // Always use tiny quality for thumbnails
    const quality = 'tiny';

    // Get the thumbnail path with texture from the asset server
    const primaryPath = getClothingThumbnail(
      model,
      componentId,
      drawableId,
      textureId,
      quality
    );
    setImagePath(primaryPath);

    // Also prepare a fallback thumbnail path without texture from the asset server
    const backupPath = getClothingThumbnailFallback(
      model,
      componentId,
      drawableId,
      quality
    );
    setFallbackPath(backupPath);

    // Preload the image to check if it exists
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setUsingFallback(false);
    };
    img.onerror = () => {
      // If primary image fails to load, try the fallback
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        setImageLoaded(true);
        setUsingFallback(true);
      };
      fallbackImg.onerror = () => {
        // If both fail, show the no preview message
        setImageLoaded(false);
      };
      fallbackImg.src = backupPath;
    };
    img.src = primaryPath;
  }, [model, componentId, drawableId, textureId]);

  // Handle image error (fallback to the backup path)
  const handleImageError = () => {
    setUsingFallback(true);
  };

  return (
    <div className="flex justify-center items-center p-2 glass-dark rounded-lg h-48 overflow-hidden">
      {imageLoaded ? (
        <img
          src={usingFallback ? fallbackPath : imagePath}
          alt={`${clothingKey} preview`}
          className="max-h-full max-w-full object-contain"
          onError={handleImageError}
        />
      ) : (
        <div className="text-center text-gray-400">
          <p>No preview available</p>
          <p className="text-sm mt-1">
            Item: {clothingKey} #{drawableId}
          </p>
          <p className="text-xs mt-1">Texture: {textureId}</p>
        </div>
      )}
    </div>
  );
};
