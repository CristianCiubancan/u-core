import React from 'react';
import { SliderInput } from '../../../../../../../webview/components';
import { AppearanceData } from '../../types';

interface AppearanceTabProps {
  appearanceData: AppearanceData;
  onAppearanceChange: (category: string, key: string, value: number) => void;
  onEyeColorChange: (value: number) => void;
}

export const AppearanceTab: React.FC<AppearanceTabProps> = ({
  appearanceData,
  onAppearanceChange,
  onEyeColorChange,
}) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Appearance Customization</h2>

      <div className="grid grid-cols-2 gap-4">
        <SliderInput
          label="Eyebrows Style"
          min={0}
          max={33}
          value={appearanceData.eyebrows.style}
          onChange={(value) => onAppearanceChange('eyebrows', 'style', value)}
          valueLabel="Style"
        />

        <SliderInput
          label="Eyebrows Color"
          min={0}
          max={63}
          value={appearanceData.eyebrows.color || 0}
          onChange={(value) => onAppearanceChange('eyebrows', 'color', value)}
          valueLabel="Color"
        />

        <SliderInput
          label="Beard Style"
          min={0}
          max={28}
          value={appearanceData.beard.style}
          onChange={(value) => onAppearanceChange('beard', 'style', value)}
          valueLabel="Style"
        />

        <SliderInput
          label="Beard Color"
          min={0}
          max={63}
          value={appearanceData.beard.color || 0}
          onChange={(value) => onAppearanceChange('beard', 'color', value)}
          valueLabel="Color"
        />

        <SliderInput
          label="Eye Color"
          min={0}
          max={31}
          value={appearanceData.eyeColor}
          onChange={onEyeColorChange}
          valueLabel="Color"
        />
      </div>
    </div>
  );
};
