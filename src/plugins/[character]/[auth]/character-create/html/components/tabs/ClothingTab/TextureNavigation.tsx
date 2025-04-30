import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { IconWrapper } from '../../common';

// Texture Navigation component
interface TextureNavigationProps {
  currentTexture: number;
  maxTextures: number;
  onPrevious: () => void;
  onNext: () => void;
}

export const TextureNavigation: React.FC<TextureNavigationProps> = ({
  currentTexture,
  maxTextures,
  onPrevious,
  onNext,
}) => {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onPrevious}
        className="p-1 rounded-full glass-dark hover:glass-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-500"
        aria-label="Previous texture"
      >
        <IconWrapper>
          <FaChevronLeft className="text-brand-300" />
        </IconWrapper>
      </button>
      <span className="text-xs text-gray-300">
        {currentTexture + 1}/{maxTextures}
      </span>
      <button
        onClick={onNext}
        className="p-1 rounded-full glass-dark hover:glass-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-500"
        aria-label="Next texture"
      >
        <IconWrapper>
          <FaChevronRight className="text-brand-300" />
        </IconWrapper>
      </button>
    </div>
  );
};
