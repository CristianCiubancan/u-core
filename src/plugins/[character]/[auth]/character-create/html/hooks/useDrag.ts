import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchNui } from '../../../../../../webview/utils/fetchNui';

interface UseDragOptions {
  onDragStart?: (x: number, y: number) => void;
  onDragMove?: (deltaX: number, deltaY: number) => void;
  onDragEnd?: () => void;
  minDragDelta?: number;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
}

/**
 * Custom hook to handle drag gestures for both mouse and touch events
 */
export const useDrag = ({
  onDragStart,
  onDragMove,
  onDragEnd,
  minDragDelta = 2,
}: UseDragOptions = {}) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });
  
  // Store has-dragged state in localStorage to persist between sessions
  const [hasEverDragged, setHasEverDragged] = useState<boolean>(() => {
    return localStorage.getItem('character-create:has-dragged') === 'true';
  });
  
  const animationFrameRef = useRef<number | null>(null);

  // Handle drag start
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setDragState({
      isDragging: true,
      startX: clientX,
      startY: clientY,
      lastX: clientX,
      lastY: clientY,
    });
    
    onDragStart?.(clientX, clientY);
  }, [onDragStart]);

  // Handle drag movement
  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragState.isDragging) return;

    // Calculate the delta from the last position
    const deltaX = clientX - dragState.lastX;
    const deltaY = clientY - dragState.lastY;

    // Only process significant movements to avoid jitter
    if (Math.abs(deltaX) < minDragDelta && Math.abs(deltaY) < minDragDelta) return;

    // Update the last position
    setDragState((prev) => ({
      ...prev,
      lastX: clientX,
      lastY: clientY,
    }));

    // Mark that the user has dragged at least once
    if (!hasEverDragged) {
      setHasEverDragged(true);
      localStorage.setItem('character-create:has-dragged', 'true');
    }

    // Call the provided drag move handler
    onDragMove?.(deltaX, deltaY);
  }, [dragState, hasEverDragged, minDragDelta, onDragMove]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDragState((prev) => ({
      ...prev,
      isDragging: false,
    }));

    onDragEnd?.();
  }, [onDragEnd]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  }, [handleDragStart]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  }, [handleDragStart]);

  // Global event handlers (attached when dragging)
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging) return;
    e.preventDefault();

    // Use requestAnimationFrame to throttle the drag events
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      handleDragMove(e.clientX, e.clientY);
    });
  }, [dragState.isDragging, handleDragMove]);

  const handleGlobalMouseUp = useCallback((e: MouseEvent) => {
    if (!dragState.isDragging) return;
    e.preventDefault();
    handleDragEnd();
  }, [dragState.isDragging, handleDragEnd]);

  const handleGlobalTouchMove = useCallback((e: TouchEvent) => {
    if (!dragState.isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    // Use requestAnimationFrame to throttle the drag events
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
    });
  }, [dragState.isDragging, handleDragMove]);

  const handleGlobalTouchEnd = useCallback((e: TouchEvent) => {
    if (!dragState.isDragging) return;
    e.preventDefault();
    handleDragEnd();
  }, [dragState.isDragging, handleDragEnd]);

  // Set up and clean up event listeners
  useEffect(() => {
    // Only add global listeners when dragging is active
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      window.addEventListener('touchend', handleGlobalTouchEnd);
      window.addEventListener('touchcancel', handleGlobalTouchEnd);
    }

    // Clean up event listeners
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('touchmove', handleGlobalTouchMove);
      window.removeEventListener('touchend', handleGlobalTouchEnd);
      window.removeEventListener('touchcancel', handleGlobalTouchEnd);

      // Clean up any pending animation frames
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    dragState.isDragging,
    handleGlobalMouseMove,
    handleGlobalMouseUp,
    handleGlobalTouchMove,
    handleGlobalTouchEnd,
  ]);

  // Reset the drag state (for testing)
  const resetDragPrompts = useCallback(() => {
    localStorage.removeItem('character-create:has-dragged');
    setHasEverDragged(false);
  }, []);

  // Expose resetting function in window object when needed
  useEffect(() => {
    (window as any).resetDragPrompts = resetDragPrompts;
    return () => {
      delete (window as any).resetDragPrompts;
    };
  }, [resetDragPrompts]);

  return {
    isDragging: dragState.isDragging,
    hasEverDragged,
    handleMouseDown,
    handleTouchStart,
    resetDragPrompts,
  };
};