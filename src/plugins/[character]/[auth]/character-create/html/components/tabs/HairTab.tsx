import React from 'react';
import { HairData } from '../../../shared/types';
import { Slider, TabLayout } from '../common';

interface HairTabProps {
  hairData: HairData;
  onHairChange: (key: string, value: number) => void;
}

export const HairTab: React.FC<HairTabProps> = ({ hairData, onHairChange }) => {
  return (
    <TabLayout title="Hair Customization">
      <Slider
        id="hair-style"
        label="Hair Style"
        min={0}
        max={73}
        value={hairData.style}
        onChange={(value) => onHairChange('style', value)}
        valueLabel="Style"
      />

      <Slider
        id="hair-color"
        label="Hair Color"
        min={0}
        max={63}
        value={hairData.color}
        onChange={(value) => onHairChange('color', value)}
        valueLabel="Color"
      />

      <Slider
        id="hair-highlight"
        label="Hair Highlight"
        min={0}
        max={63}
        value={hairData.highlight}
        onChange={(value) => onHairChange('highlight', value)}
        valueLabel="Highlight"
      />
    </TabLayout>
  );
};
