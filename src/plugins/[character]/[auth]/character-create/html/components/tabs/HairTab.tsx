import React from 'react';
import { HairData } from '../../../shared/types';
import { Slider, TabLayout } from '../common';
import { useCharacterData } from '../../context/CharacterDataContext';

// Keep props interface for backward compatibility
interface HairTabProps {
  hairData?: HairData;
  onHairChange?: (key: string, value: number) => void;
}

export const HairTab: React.FC<HairTabProps> = (props) => {
  // Get data from context
  const { characterData, handleHairChange } = useCharacterData();

  // Use props if provided (for backward compatibility), otherwise use context
  const hairData = props.hairData || characterData.hair;
  const onHairChange = props.onHairChange || handleHairChange;

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
