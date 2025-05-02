import React from 'react';
import { useCharacterData } from '../../context/CharacterDataContext';
import { ClothingImage } from './ClothingImage';
import { LoadingIndicator } from '../common';

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
  return (
    <div
      className={`relative w-full aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
        isSelected ? 'glass-brand-dark' : 'glass-dark'
      }`}
      onClick={onClick}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <ClothingImage
          model={model}
          componentId={componentId}
          drawableId={drawableId}
          textureId={textureId}
          quality="tiny"
        />
      </div>
    </div>
  );
};

export const ClothingVariationsSection: React.FC = () => {
  const {
    characterData,
    selectedClothingItem,
    handleSelectTexture,
    isVerifyingTextures,
  } = useCharacterData();

  // If no item is selected or no variations are available, show a message
  if (
    !selectedClothingItem ||
    selectedClothingItem.verifiedTextures.length <= 1
  ) {
    return (
      <div className="glass-dark p-4 rounded-lg text-center h-full flex items-center justify-center overflow-hidden">
        <p className="text-sm text-gray-400">
          {!selectedClothingItem
            ? 'Select a clothing item to view variations'
            : 'No variations available for this item'}
        </p>
      </div>
    );
  }

  // If we're still verifying textures, show a loading indicator
  if (isVerifyingTextures) {
    return (
      <div className="glass-dark p-4 rounded-lg text-center h-full flex flex-col items-center justify-center overflow-hidden">
        <LoadingIndicator size="medium" />
        <p className="text-sm text-gray-400 mt-2">Loading variations...</p>
      </div>
    );
  }

  // Get the current model from character data
  const { model } = characterData;
  const { componentId, drawableId, verifiedTextures, selectedTexture } =
    selectedClothingItem;

  return (
    <div className="glass-dark p-4 rounded-lg h-full flex flex-col">
      <div className="flex flex-col gap-2 items-center mb-3 flex-shrink-0">
        <h3 className="text-on-dark font-semibold text-xs">Variations</h3>
        <span className="text-xs text-gray-400">
          {verifiedTextures.length} available
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 overflow-y-auto overflow-x-hidden scrollbar-brand-dark w-full max-w-full">
        {verifiedTextures.map((textureId) => (
          <div className="w-full aspect-square" key={textureId}>
            <TextureVariationItem
              model={model}
              componentId={componentId}
              drawableId={drawableId}
              textureId={textureId}
              isSelected={textureId === selectedTexture}
              onClick={() => handleSelectTexture(textureId)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
