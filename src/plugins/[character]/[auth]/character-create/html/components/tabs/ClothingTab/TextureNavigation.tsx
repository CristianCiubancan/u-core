import React, { useState, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { IconWrapper } from '../../common';
import { verifyTextures, getPreviousValidTexture, getNextValidTexture } from '../../../utils/textureVerification';

// Texture Navigation component
interface TextureNavigationProps {
  currentTexture: number;
  maxTextures: number;
  onPrevious: () => void;
  onNext: () => void;
  // New props for verified navigation
  model?: string;
  componentId?: number;
  drawableId?: number;
  onSetTexture?: (textureId: number) => void;
}

export const TextureNavigation: React.FC<TextureNavigationProps> = ({
  currentTexture,
  maxTextures,
  onPrevious,
  onNext,
  // Optional props for verified navigation
  model,
  componentId,
  drawableId,
  onSetTexture,
}) => {
  // State to track verified textures
  const [verifiedTextures, setVerifiedTextures] = useState<number[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  
  // If all required props for verified navigation are provided, use it
  const useVerifiedNavigation = !!(model && componentId !== undefined && drawableId !== undefined && onSetTexture);
  
  // Verify textures when props change
  useEffect(() => {
    if (useVerifiedNavigation && !isVerified && maxTextures > 1) {
      verifyTextures(model!, componentId!, drawableId!, maxTextures).then(textures => {
        if (textures.length > 0) {
          setVerifiedTextures(textures);
          setIsVerified(true);
        }
      });
    }
  }, [model, componentId, drawableId, maxTextures, useVerifiedNavigation, isVerified]);
  
  // Get display values based on verification status
  const getDisplayValues = () => {
    if (useVerifiedNavigation && isVerified && verifiedTextures.length > 0) {
      // Find the index of current texture in verified textures
      const currentIndex = verifiedTextures.indexOf(currentTexture);
      // If not found, default to the first texture
      const displayIndex = currentIndex >= 0 ? currentIndex : 0;
      return {
        current: displayIndex + 1,
        total: verifiedTextures.length
      };
    } else {
      return {
        current: currentTexture + 1,
        total: maxTextures
      };
    }
  };
  
  const { current, total } = getDisplayValues();
  
  // Handle navigation with verified textures
  const handlePrevious = () => {
    if (useVerifiedNavigation && isVerified && verifiedTextures.length > 0) {
      const prevTexture = getPreviousValidTexture(currentTexture, verifiedTextures);
      onSetTexture!(prevTexture);
    } else {
      onPrevious();
    }
  };
  
  const handleNext = () => {
    if (useVerifiedNavigation && isVerified && verifiedTextures.length > 0) {
      const nextTexture = getNextValidTexture(currentTexture, verifiedTextures);
      onSetTexture!(nextTexture);
    } else {
      onNext();
    }
  };
  
  // Disable navigation if there are no variations
  const disableNavigation = total <= 1;
  
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handlePrevious}
        disabled={disableNavigation}
        className={`p-1 rounded-full ${
          disableNavigation ? 'opacity-50 cursor-not-allowed' : 'glass-dark hover:glass-brand-dark'
        } focus:outline-none focus:ring-2 focus:ring-brand-500`}
        aria-label="Previous texture"
      >
        <IconWrapper>
          <FaChevronLeft className="text-brand-300" />
        </IconWrapper>
      </button>
      <span className="text-xs text-gray-300">
        {current}/{total}
      </span>
      <button
        onClick={handleNext}
        disabled={disableNavigation}
        className={`p-1 rounded-full ${
          disableNavigation ? 'opacity-50 cursor-not-allowed' : 'glass-dark hover:glass-brand-dark'
        } focus:outline-none focus:ring-2 focus:ring-brand-500`}
        aria-label="Next texture"
      >
        <IconWrapper>
          <FaChevronRight className="text-brand-300" />
        </IconWrapper>
      </button>
    </div>
  );
};
