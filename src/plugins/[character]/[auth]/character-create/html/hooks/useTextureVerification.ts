import { useState, useEffect, useCallback } from 'react';
import {
  verifyTextures,
  quickCheckHasVariations,
  getNextValidTexture,
  getPreviousValidTexture,
} from '../utils/textureVerification';

interface TextureVerificationOptions {
  autoVerify?: boolean;
  onVerificationComplete?: (textures: number[]) => void;
}

/**
 * Custom hook to handle texture verification for clothing items
 */
export const useTextureVerification = (
  model: string,
  componentId: number,
  drawableId: number,
  maxTextures: number,
  options: TextureVerificationOptions = {}
) => {
  const { autoVerify = false, onVerificationComplete } = options;
  
  const [selectedTexture, setSelectedTexture] = useState<number>(0);
  const [verifiedTextures, setVerifiedTextures] = useState<number[]>([]);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [hasVariations, setHasVariations] = useState<boolean>(false);
  const [variationsChecked, setVariationsChecked] = useState<boolean>(false);

  // Quick check for variations
  useEffect(() => {
    if (!variationsChecked && maxTextures > 1) {
      setVariationsChecked(true);
      
      quickCheckHasVariations(model, componentId, drawableId).then(
        (mightHaveVariations) => {
          setHasVariations(mightHaveVariations);
        }
      );
    }
  }, [model, componentId, drawableId, maxTextures, variationsChecked]);

  // Full verification when requested
  const verifyAllTextures = useCallback(async () => {
    if (isVerifying || verifiedTextures.length > 0) return;
    
    setIsVerifying(true);
    
    try {
      const textures = await verifyTextures(model, componentId, drawableId, maxTextures);
      setVerifiedTextures(textures);
      setHasVariations(textures.length > 1);
      
      // If the current texture isn't valid, select the first valid one
      if (textures.length > 0 && !textures.includes(selectedTexture)) {
        setSelectedTexture(textures[0]);
      }
      
      onVerificationComplete?.(textures);
    } finally {
      setIsVerifying(false);
    }
  }, [
    model, 
    componentId, 
    drawableId, 
    maxTextures, 
    isVerifying, 
    verifiedTextures.length, 
    selectedTexture,
    onVerificationComplete
  ]);

  // Auto-verify if option is enabled
  useEffect(() => {
    if (autoVerify && hasVariations && verifiedTextures.length === 0) {
      verifyAllTextures();
    }
  }, [autoVerify, hasVariations, verifiedTextures.length, verifyAllTextures]);

  // Reset verification when drawable changes
  useEffect(() => {
    setVariationsChecked(false);
    setHasVariations(false);
    setVerifiedTextures([]);
    setSelectedTexture(0);
  }, [drawableId]);

  // Utility functions for navigating textures
  const selectNextTexture = useCallback(() => {
    if (verifiedTextures.length <= 1) return;
    
    const nextTexture = getNextValidTexture(selectedTexture, verifiedTextures);
    setSelectedTexture(nextTexture);
    return nextTexture;
  }, [selectedTexture, verifiedTextures]);

  const selectPreviousTexture = useCallback(() => {
    if (verifiedTextures.length <= 1) return;
    
    const prevTexture = getPreviousValidTexture(selectedTexture, verifiedTextures);
    setSelectedTexture(prevTexture);
    return prevTexture;
  }, [selectedTexture, verifiedTextures]);

  const selectTexture = useCallback((textureId: number) => {
    if (verifiedTextures.length > 0 && !verifiedTextures.includes(textureId)) {
      console.warn(`Texture ${textureId} is not in the verified textures list`);
      return false;
    }
    
    setSelectedTexture(textureId);
    return true;
  }, [verifiedTextures]);

  return {
    selectedTexture,
    verifiedTextures,
    hasVariations,
    isVerifying,
    variationsChecked,
    verifyAllTextures,
    selectTexture,
    selectNextTexture,
    selectPreviousTexture,
  };
};