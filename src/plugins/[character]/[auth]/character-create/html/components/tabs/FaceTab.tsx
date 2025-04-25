import React from 'react';
import { SliderInput } from '../SliderInput';
import { CharacterData } from '../../types';

interface FaceTabProps {
  faceData: CharacterData['face'];
  onFaceChange: (key: string, value: number) => void;
}

export const FaceTab: React.FC<FaceTabProps> = ({ faceData, onFaceChange }) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Face Customization</h2>

      <SliderInput
        label="Father"
        min={0}
        max={45}
        value={faceData.fatherIndex}
        onChange={(value) => onFaceChange('fatherIndex', value)}
      />

      <SliderInput
        label="Mother"
        min={0}
        max={45}
        value={faceData.motherIndex}
        onChange={(value) => onFaceChange('motherIndex', value)}
      />

      <SliderInput
        label="Shape Mix (Father - Mother)"
        min={0}
        max={1}
        step={0.01}
        value={faceData.shapeMix}
        onChange={(value) => onFaceChange('shapeMix', value)}
        minLabel="Father"
        maxLabel="Mother"
      />

      <SliderInput
        label="Skin Mix (Father - Mother)"
        min={0}
        max={1}
        step={0.01}
        value={faceData.skinMix}
        onChange={(value) => onFaceChange('skinMix', value)}
        minLabel="Father"
        maxLabel="Mother"
      />
    </div>
  );
};
