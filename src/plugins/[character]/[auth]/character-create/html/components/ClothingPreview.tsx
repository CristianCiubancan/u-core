import React, { useState, useEffect } from 'react';
import {
  getClothingImage,
  getClothingImageFallback,
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

    // Define the quality level - could be made configurable via props
    const quality = 'medium';

    // Get the primary image path with texture from the asset server
    const primaryPath = getClothingImage(
      model,
      componentId,
      drawableId,
      textureId,
      quality
    );
    setImagePath(primaryPath);

    // Also prepare a fallback path without texture from the asset server
    const backupPath = getClothingImageFallback(
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
      // Try the fallback image without texture
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        setImageLoaded(true);
        setUsingFallback(true);
      };
      fallbackImg.onerror = () => {
        setImageLoaded(false);
        setUsingFallback(false);
      };
      fallbackImg.src = backupPath;
    };
    img.src = primaryPath;
  }, [model, componentId, drawableId, textureId]);

  // Function to handle image loading errors
  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    // If we're already using the fallback and it fails, show no image
    if (usingFallback) {
      setImageLoaded(false);
      e.currentTarget.style.display = 'none';
      return;
    }

    // Try the fallback image
    setUsingFallback(true);
    e.currentTarget.src = fallbackPath;
  };

  return (
    <div className="flex justify-center items-center p-2 bg-black/20 rounded-lg h-48 overflow-hidden">
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
