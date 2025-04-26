import React from 'react';
import { SliderInput } from '../../../../../../../webview/components';
import { CharacterData } from '../../types';

interface HairTabProps {
  hairData: CharacterData['hair'];
  onHairChange: (key: string, value: number) => void;
}

export const HairTab: React.FC<HairTabProps> = ({ hairData, onHairChange }) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Hair Customization</h2>

      <SliderInput
        label="Hair Style"
        min={0}
        max={73}
        value={hairData.style}
        onChange={(value) => onHairChange('style', value)}
        valueLabel="Style"
      />

      <SliderInput
        label="Hair Color"
        min={0}
        max={63}
        value={hairData.color}
        onChange={(value) => onHairChange('color', value)}
        valueLabel="Color"
      />

      <SliderInput
        label="Hair Highlight"
        min={0}
        max={63}
        value={hairData.highlight}
        onChange={(value) => onHairChange('highlight', value)}
        valueLabel="Highlight"
      />
    </div>
  );
};
