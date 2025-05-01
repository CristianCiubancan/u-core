import { useState, useEffect, useRef } from 'react';

interface ImageLoaderOptions {
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Custom hook to handle image loading with fallback support
 */
export const useImageLoader = (
  src: string,
  options: ImageLoaderOptions = {}
) => {
  const { fallbackSrc, onLoad, onError } = options;
  
  const [imageSrc, setImageSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const fallbackAttemptedRef = useRef<boolean>(false);

  useEffect(() => {
    // Reset states when src changes
    setIsLoading(true);
    setIsError(false);
    setImageSrc(src);
    fallbackAttemptedRef.current = false;

    // Create new image to check loading
    const img = new Image();
    
    img.onload = () => {
      setIsLoading(false);
      setIsError(false);
      onLoad?.();
    };
    
    img.onerror = () => {
      // If we have a fallback and haven't tried it yet
      if (fallbackSrc && !fallbackAttemptedRef.current) {
        fallbackAttemptedRef.current = true;
        
        // Try the fallback
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setImageSrc(fallbackSrc);
          setIsLoading(false);
          setIsError(false);
          onLoad?.();
        };
        
        fallbackImg.onerror = () => {
          setIsLoading(false);
          setIsError(true);
          onError?.();
        };
        
        fallbackImg.src = fallbackSrc;
      } else {
        // No fallback or fallback also failed
        setIsLoading(false);
        setIsError(true);
        onError?.();
      }
    };
    
    img.src = src;
    
    // Clean up
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, fallbackSrc, onLoad, onError]);

  return {
    imageSrc,
    isLoading,
    isError
  };
};