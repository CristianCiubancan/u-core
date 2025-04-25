import React from 'react';
import { SliderInput } from '../SliderInput';
import { CharacterData } from '../../types';

interface ClothingTabProps {
  clothingData: CharacterData['clothing'];
  onClothingChange: (key: string, value: number) => void;
}

export const ClothingTab: React.FC<ClothingTabProps> = ({
  clothingData,
  onClothingChange,
}) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Clothing Customization</h2>

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
