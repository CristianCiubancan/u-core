import React from 'react';
import { AppearanceData } from '../../../shared/types';
import { Slider, TabLayout } from '../common';

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
        <div className="mb-4">
          <label
            htmlFor="eyebrows-style"
            className="block text-sm font-medium text-white text-shadow mb-2"
          >
            Eyebrows Style
          </label>
          <input
            id="eyebrows-style"
            type="range"
            min={0}
            max={33}
            value={appearanceData.eyebrows.style}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onAppearanceChange(
                'eyebrows',
                'style',
                parseInt(event.target.value)
              )
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-sm"
          />
          <div className="text-right text-xs text-white text-shadow mt-1">
            Style: {appearanceData.eyebrows.style}
          </div>
        </div>

        <div className="mb-4">
          <label
            htmlFor="eyebrows-color"
            className="block text-sm font-medium text-white text-shadow mb-2"
          >
            Eyebrows Color
          </label>
          <input
            id="eyebrows-color"
            type="range"
            min={0}
            max={63}
            value={appearanceData.eyebrows.color || 0}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onAppearanceChange(
                'eyebrows',
                'color',
                parseInt(event.target.value)
              )
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-sm"
          />
          <div className="text-right text-xs text-white text-shadow mt-1">
            Color: {appearanceData.eyebrows.color || 0}
          </div>
        </div>

        <div className="mb-4">
          <label
            htmlFor="beard-style"
            className="block text-sm font-medium text-white text-shadow mb-2"
          >
            Beard Style
          </label>
          <input
            id="beard-style"
            type="range"
            min={0}
            max={28}
            value={appearanceData.beard.style}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onAppearanceChange('beard', 'style', parseInt(event.target.value))
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-sm"
          />
          <div className="text-right text-xs text-white text-shadow mt-1">
            Style: {appearanceData.beard.style}
          </div>
        </div>

        <div className="mb-4">
          <label
            htmlFor="beard-color"
            className="block text-sm font-medium text-white text-shadow mb-2"
          >
            Beard Color
          </label>
          <input
            id="beard-color"
            type="range"
            min={0}
            max={63}
            value={appearanceData.beard.color || 0}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onAppearanceChange('beard', 'color', parseInt(event.target.value))
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-sm"
          />
          <div className="text-right text-xs text-white text-shadow mt-1">
            Color: {appearanceData.beard.color || 0}
          </div>
        </div>

        <div className="mb-4">
          <label
            htmlFor="eye-color"
            className="block text-sm font-medium text-white text-shadow mb-2"
          >
            Eye Color
          </label>
          <input
            id="eye-color"
            type="range"
            min={0}
            max={31}
            value={appearanceData.eyeColor}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onEyeColorChange(parseInt(event.target.value))
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-sm"
          />
          <div className="text-right text-xs text-white text-shadow mt-1">
            Color: {appearanceData.eyeColor}
          </div>
        </div>
      </div>
    </div>
  );
};
