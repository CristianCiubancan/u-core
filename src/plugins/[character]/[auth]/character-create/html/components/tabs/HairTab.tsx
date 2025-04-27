import React from 'react';
import { CharacterData } from '../../types';

interface HairTabProps {
  hairData: CharacterData['hair'];
  onHairChange: (key: string, value: number) => void;
}

export const HairTab: React.FC<HairTabProps> = ({ hairData, onHairChange }) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Hair Customization</h2>

      <div className="mb-4">
        <label
          htmlFor="hair-style"
          className="block text-sm font-medium text-white text-shadow mb-2"
        >
          Hair Style
        </label>
        <input
          id="hair-style"
          type="range"
          min={0}
          max={73}
          value={hairData.style}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onHairChange('style', parseInt(event.target.value))
          }
          className="w-full h-2 bg-brand-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-sm"
        />
        <div className="text-right text-xs text-white text-shadow mt-1">
          Style: {hairData.style}
        </div>
      </div>

      <div className="mb-4">
        <label
          htmlFor="hair-color"
          className="block text-sm font-medium text-white text-shadow mb-2"
        >
          Hair Color
        </label>
        <input
          id="hair-color"
          type="range"
          min={0}
          max={63}
          value={hairData.color}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onHairChange('color', parseInt(event.target.value))
          }
          className="w-full h-2 bg-brand-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-sm"
        />
        <div className="text-right text-xs text-white text-shadow mt-1">
          Color: {hairData.color}
        </div>
      </div>

      <div className="mb-4">
        <label
          htmlFor="hair-highlight"
          className="block text-sm font-medium text-white text-shadow mb-2"
        >
          Hair Highlight
        </label>
        <input
          id="hair-highlight"
          type="range"
          min={0}
          max={63}
          value={hairData.highlight}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onHairChange('highlight', parseInt(event.target.value))
          }
          className="w-full h-2 bg-brand-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-sm"
        />
        <div className="text-right text-xs text-white text-shadow mt-1">
          Highlight: {hairData.highlight}
        </div>
      </div>
    </div>
  );
};
