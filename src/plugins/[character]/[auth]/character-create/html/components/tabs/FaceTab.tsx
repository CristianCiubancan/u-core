import React from 'react';
import { CharacterData } from '../../types';

interface FaceTabProps {
  faceData: CharacterData['face'];
  onFaceChange: (key: string, value: number) => void;
}

export const FaceTab: React.FC<FaceTabProps> = ({ faceData, onFaceChange }) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Face Customization</h2>

      <div className="mb-4">
        <label
          htmlFor="father-index"
          className="block text-sm font-medium text-white text-shadow mb-2"
        >
          Father
        </label>
        <input
          id="father-index"
          type="range"
          min={0}
          max={45}
          value={faceData.fatherIndex}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onFaceChange('fatherIndex', parseInt(event.target.value))
          }
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-sm"
        />
        <div className="text-right text-xs text-white text-shadow mt-1">
          Father Index: {faceData.fatherIndex}
        </div>
      </div>

      <div className="mb-4">
        <label
          htmlFor="mother-index"
          className="block text-sm font-medium text-white text-shadow mb-2"
        >
          Mother
        </label>
        <input
          id="mother-index"
          type="range"
          min={0}
          max={45}
          value={faceData.motherIndex}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onFaceChange('motherIndex', parseInt(event.target.value))
          }
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-sm"
        />
        <div className="text-right text-xs text-white text-shadow mt-1">
          Mother Index: {faceData.motherIndex}
        </div>
      </div>

      <div className="mb-4">
        <label
          htmlFor="shape-mix"
          className="block text-sm font-medium text-white text-shadow mb-2"
        >
          Shape Mix (Father - Mother)
        </label>
        <input
          id="shape-mix"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={faceData.shapeMix}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onFaceChange('shapeMix', parseFloat(event.target.value))
          }
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-sm"
        />
        <div className="text-right text-xs text-white text-shadow mt-1">
          Shape Mix: {faceData.shapeMix.toFixed(2)}
        </div>
      </div>

      <div className="mb-4">
        <label
          htmlFor="skin-mix"
          className="block text-sm font-medium text-white text-shadow mb-2"
        >
          Skin Mix (Father - Mother)
        </label>
        <input
          id="skin-mix"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={faceData.skinMix}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            onFaceChange('skinMix', parseFloat(event.target.value))
          }
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-sm"
        />
        <div className="text-right text-xs text-white text-shadow mt-1">
          Skin Mix: {faceData.skinMix.toFixed(2)}
        </div>
      </div>
    </div>
  );
};
