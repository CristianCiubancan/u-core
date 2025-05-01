import React from 'react';
import { useImageLoader } from '../../hooks';
import Spinner from '../../../../../../../webview/components/ui/Spinner';

interface ClothingImageProps {
  model: string;
  componentId: number;
  drawableId: number;
  textureId: number;
  quality: 'tiny' | 'low' | 'medium' | 'high';
  fallbackSrc?: string;
}

export const ClothingImage: React.FC<ClothingImageProps> = ({
  model,
  componentId,
  drawableId,
  textureId,
  quality,
  fallbackSrc,
}) => {
  // Construct image path based on properties
  const mainSrc = `/assets/clothing/${model}/${componentId}/${drawableId}/${textureId}_${quality}.png`;
  
  // Use our custom image loader hook
  const { imageSrc, isLoading, isError } = useImageLoader(mainSrc, {
    fallbackSrc: fallbackSrc,
  });

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Spinner size="sm" color="brand" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full h-full flex items-center justify-center flex-col">
        <span className="text-xs text-center">{drawableId}</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={`Clothing item ${drawableId} texture ${textureId}`}
      className="w-full h-full object-cover"
    />
  );
};