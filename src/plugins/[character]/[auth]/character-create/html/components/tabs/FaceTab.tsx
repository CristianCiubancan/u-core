import React from 'react';
import { FaceData } from '../../../shared/types';
import { Slider, TabLayout } from '../common';

interface FaceTabProps {
  faceData: FaceData;
  onFaceChange: (key: string, value: number) => void;
}

export const FaceTab: React.FC<FaceTabProps> = ({ faceData, onFaceChange }) => {
  return (
    <TabLayout title="Face Customization">
      <Slider
        id="father-index"
        label="Father"
        min={0}
        max={45}
        value={faceData.fatherIndex}
        onChange={(value) => onFaceChange('fatherIndex', value)}
        valueLabel="Father Index"
      />

      <Slider
        id="mother-index"
        label="Mother"
        min={0}
        max={45}
        value={faceData.motherIndex}
        onChange={(value) => onFaceChange('motherIndex', value)}
        valueLabel="Mother Index"
      />

      <Slider
        id="shape-mix"
        label="Shape Mix (Father - Mother)"
        min={0}
        max={1}
        step={0.01}
        value={faceData.shapeMix}
        onChange={(value) => onFaceChange('shapeMix', value)}
        valueLabel="Shape Mix"
      />

      <Slider
        id="skin-mix"
        label="Skin Mix (Father - Mother)"
        min={0}
        max={1}
        step={0.01}
        value={faceData.skinMix}
        onChange={(value) => onFaceChange('skinMix', value)}
        valueLabel="Skin Mix"
      />
    </TabLayout>
  );
};
