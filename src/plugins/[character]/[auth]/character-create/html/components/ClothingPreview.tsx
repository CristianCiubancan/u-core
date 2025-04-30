import React, { useState, useEffect } from 'react';
import {
  getClothingThumbnail,
  getClothingThumbnailFallback,
  getComponentIdFromKey,
} from '../utils/getClothingImage';
import Spinner from '../../../../../../webview/components/ui/Spinner';

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

  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    // Reset states when props change
    setImageLoaded(false);
    setUsingFallback(false);
    setLoadFailed(false);

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
      setLoadFailed(false);
    };
    img.onerror = () => {
      // If primary image fails to load, try the fallback
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        setImageLoaded(true);
        setUsingFallback(true);
        setLoadFailed(false);
      };
      fallbackImg.onerror = () => {
        // If both fail, show the no preview message
        setImageLoaded(false);
        setLoadFailed(true);
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
      ) : loadFailed ? (
        <div className="text-center text-gray-400 flex flex-col items-center justify-center">
          <p>No preview available</p>
          <p className="text-sm mt-1">
            Item: {clothingKey} #{drawableId}
          </p>
          <p className="text-xs mt-1">Texture: {textureId}</p>
        </div>
      ) : (
        <div className="text-center text-gray-400 flex flex-col items-center justify-center">
          <Spinner size="md" color="brand" className="mb-3" />
          <p>Loading preview...</p>
        </div>
      )}
    </div>
  );
};
