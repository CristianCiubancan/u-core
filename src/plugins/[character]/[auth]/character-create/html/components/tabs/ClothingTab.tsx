import React, { useState } from 'react';
import { SliderInput } from '../SliderInput';
import { CharacterData } from '../../types';
import { ClothingPreview } from '../ClothingPreview';

interface ClothingTabProps {
  clothingData: CharacterData['clothing'];
  onClothingChange: (key: string, value: number) => void;
  model: string; // Added model prop to pass to ClothingPreview
}

export const ClothingTab: React.FC<ClothingTabProps> = ({
  clothingData,
  onClothingChange,
  model,
}) => {
  // State to track which clothing item is currently being previewed
  const [previewItem, setPreviewItem] = useState<string>('tops');

  // Function to handle clicking on a clothing category to preview it
  const handlePreviewSelect = (key: string) => {
    setPreviewItem(key);
  };

  // Get the drawable ID and texture ID for the currently selected preview item
  const getDrawableAndTexture = () => {
    switch (previewItem) {
      case 'tops':
        return {
          drawableId: clothingData.tops,
          textureId: clothingData.topsTexture,
        };
      case 'undershirt':
        return {
          drawableId: clothingData.undershirt,
          textureId: clothingData.undershirtTexture,
        };
      case 'legs':
        return {
          drawableId: clothingData.legs,
          textureId: clothingData.legsTexture,
        };
      case 'shoes':
        return {
          drawableId: clothingData.shoes,
          textureId: clothingData.shoesTexture,
        };
      case 'accessories':
        return {
          drawableId: clothingData.accessories,
          textureId: clothingData.accessoriesTexture,
        };
      case 'torso':
        return {
          drawableId: clothingData.torso,
          textureId: clothingData.torsoTexture,
        };
      default:
        return {
          drawableId: clothingData.tops,
          textureId: clothingData.topsTexture,
        };
    }
  };

  const { drawableId, textureId } = getDrawableAndTexture();

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Clothing Customization</h2>

      {/* Preview section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Preview</h3>
        <div className="flex flex-col space-y-4">
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              className={`px-3 py-1 rounded ${
                previewItem === 'tops' ? 'bg-brand-600' : 'bg-brand-800'
              }`}
              onClick={() => handlePreviewSelect('tops')}
            >
              Tops
            </button>
            <button
              className={`px-3 py-1 rounded ${
                previewItem === 'undershirt' ? 'bg-brand-600' : 'bg-brand-800'
              }`}
              onClick={() => handlePreviewSelect('undershirt')}
            >
              Undershirt
            </button>
            <button
              className={`px-3 py-1 rounded ${
                previewItem === 'legs' ? 'bg-brand-600' : 'bg-brand-800'
              }`}
              onClick={() => handlePreviewSelect('legs')}
            >
              Legs
            </button>
            <button
              className={`px-3 py-1 rounded ${
                previewItem === 'shoes' ? 'bg-brand-600' : 'bg-brand-800'
              }`}
              onClick={() => handlePreviewSelect('shoes')}
            >
              Shoes
            </button>
            <button
              className={`px-3 py-1 rounded ${
                previewItem === 'accessories' ? 'bg-brand-600' : 'bg-brand-800'
              }`}
              onClick={() => handlePreviewSelect('accessories')}
            >
              Accessories
            </button>
          </div>

          <ClothingPreview
            model={model}
            clothingKey={previewItem}
            drawableId={drawableId}
            textureId={textureId}
          />
        </div>
      </div>

      {/* Sliders section */}
      <div className="grid grid-cols-2 gap-4">
        <SliderInput
          label="Tops"
          min={0}
          max={255}
          value={clothingData.tops}
          onChange={(value) => onClothingChange('tops', value)}
          valueLabel="Style"
        />

        <SliderInput
          label="Tops Texture"
          min={0}
          max={15}
          value={clothingData.topsTexture}
          onChange={(value) => onClothingChange('topsTexture', value)}
          valueLabel="Texture"
        />

        <SliderInput
          label="Undershirt"
          min={0}
          max={255}
          value={clothingData.undershirt}
          onChange={(value) => onClothingChange('undershirt', value)}
          valueLabel="Style"
        />

        <SliderInput
          label="Undershirt Texture"
          min={0}
          max={15}
          value={clothingData.undershirtTexture}
          onChange={(value) => onClothingChange('undershirtTexture', value)}
          valueLabel="Texture"
        />

        <SliderInput
          label="Legs"
          min={0}
          max={255}
          value={clothingData.legs}
          onChange={(value) => onClothingChange('legs', value)}
          valueLabel="Style"
        />

        <SliderInput
          label="Legs Texture"
          min={0}
          max={15}
          value={clothingData.legsTexture}
          onChange={(value) => onClothingChange('legsTexture', value)}
          valueLabel="Texture"
        />

        <SliderInput
          label="Shoes"
          min={0}
          max={255}
          value={clothingData.shoes}
          onChange={(value) => onClothingChange('shoes', value)}
          valueLabel="Style"
        />

        <SliderInput
          label="Shoes Texture"
          min={0}
          max={15}
          value={clothingData.shoesTexture}
          onChange={(value) => onClothingChange('shoesTexture', value)}
          valueLabel="Texture"
        />
      </div>
    </div>
  );
};
