import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Custom hook for implementing infinite scrolling functionality
 * 
 * @param totalItems Total number of items available
 * @param initialItemsToLoad Initial number of items to load
 * @param loadMoreCount Number of items to load each time when scrolling
 * @param threshold Distance from the bottom in pixels to trigger loading more items
 * @returns Object containing paginated items indices, loading state, and container ref
 */
export const useInfiniteScroll = <T>(
  items: T[],
  initialItemsToLoad: number = 20,
  loadMoreCount: number = 20,
  threshold: number = 200
) => {
  // Store the number of items to display
  const [displayCount, setDisplayCount] = useState(initialItemsToLoad);
  
  // Store loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Reference to the scrollable container
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Calculate if we've loaded everything
  const hasMore = displayCount < items.length;

  // Function to load more items
  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    
    setIsLoading(true);
    
    // Use setTimeout to simulate loading time and prevent UI freezes
    setTimeout(() => {
      setDisplayCount(prevCount => {
        const newCount = prevCount + loadMoreCount;
        return newCount > items.length ? items.length : newCount;
      });
      setIsLoading(false);
    }, 50);
  }, [hasMore, isLoading, items.length, loadMoreCount]);

  // Handle scroll event
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;
    
    // When user scrolls close to the bottom, load more items
    if (scrollBottom < threshold && hasMore && !isLoading) {
      loadMore();
    }
  }, [hasMore, isLoading, loadMore, threshold]);

  // Attach scroll event listener
  useEffect(() => {
    const currentContainer = containerRef.current;
    if (currentContainer) {
      currentContainer.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (currentContainer) {
        currentContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

  // Get the visible items
  const visibleItems = items.slice(0, displayCount);

  return {
    containerRef,
    visibleItems,
    isLoading,
    hasMore,
    loadMore,
    displayCount
  };
};