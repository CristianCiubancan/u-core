import { useState, useEffect, useRef } from 'react';

interface ImageLoaderOptions {
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// Global cache to store loaded image statuses
// This prevents redundant loading of the same images
const imageCache: Record<string, { status: 'loading' | 'loaded' | 'error', url: string }> = {};

/**
 * Custom hook to handle image loading with fallback support and caching
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
    let isMounted = true;
    
    const loadImage = async (imageUrl: string, isFallback = false): Promise<boolean> => {
      // Check cache first
      if (imageCache[imageUrl]) {
        if (imageCache[imageUrl].status === 'loaded') {
          if (isMounted) {
            setImageSrc(imageUrl);
            setIsLoading(false);
            setIsError(false);
            onLoad?.();
          }
          return true;
        } else if (imageCache[imageUrl].status === 'error') {
          return false;
        }
        // If status is 'loading', continue with load attempt
      }
      
      // Set as loading in the cache
      imageCache[imageUrl] = { status: 'loading', url: imageUrl };
      
      return new Promise<boolean>((resolve) => {
        const img = new Image();
        
        img.onload = () => {
          // Update cache
          imageCache[imageUrl] = { status: 'loaded', url: imageUrl };
          
          if (isMounted) {
            if (!isFallback) {
              setImageSrc(imageUrl);
            } else {
              setImageSrc(imageUrl);
            }
            setIsLoading(false);
            setIsError(false);
            onLoad?.();
          }
          resolve(true);
        };
        
        img.onerror = () => {
          // Update cache
          imageCache[imageUrl] = { status: 'error', url: imageUrl };
          resolve(false);
        };
        
        img.src = imageUrl;
      });
    };
    
    const attemptLoad = async () => {
      // Reset states when src changes
      if (isMounted) {
        setIsLoading(true);
        setIsError(false);
        setImageSrc(src);
        fallbackAttemptedRef.current = false;
      }
      
      // Try to load the main image
      const mainSuccess = await loadImage(src);
      
      // If main image failed and we have a fallback
      if (!mainSuccess && fallbackSrc && !fallbackAttemptedRef.current && isMounted) {
        fallbackAttemptedRef.current = true;
        const fallbackSuccess = await loadImage(fallbackSrc, true);
        
        // If fallback also failed
        if (!fallbackSuccess && isMounted) {
          setIsLoading(false);
          setIsError(true);
          onError?.();
        }
      } else if (!mainSuccess && isMounted) {
        // No fallback or fallback already attempted
        setIsLoading(false);
        setIsError(true);
        onError?.();
      }
    };
    
    attemptLoad();
    
    // Clean up
    return () => {
      isMounted = false;
    };
  }, [src, fallbackSrc, onLoad, onError]);

  return {
    imageSrc,
    isLoading,
    isError
  };
};