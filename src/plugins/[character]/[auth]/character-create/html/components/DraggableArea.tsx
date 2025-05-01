import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchNui } from '../../../../../../webview/utils/fetchNui';

interface DraggableAreaProps {
  className?: string;
}

interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
}

const DraggableArea: React.FC<DraggableAreaProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });
  const animationFrameRef = useRef<number | null>(null);

  // Handle mouse down / touch start
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setDragState({
      isDragging: true,
      startX: clientX,
      startY: clientY,
      lastX: clientX,
      lastY: clientY,
    });
  }, []);

  // Handle mouse move / touch move
  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragState.isDragging) return;

      // Calculate the delta from the last position
      const deltaX = clientX - dragState.lastX;
      const deltaY = clientY - dragState.lastY;

      // Only process significant movements to avoid jitter
      if (Math.abs(deltaX) < 2 && Math.abs(deltaY) < 2) return;

      // Update the last position
      setDragState((prev) => ({
        ...prev,
        lastX: clientX,
        lastY: clientY,
      }));

      // Send the drag event to the client
      // We'll use deltaX for character rotation and deltaY for camera zoom
      fetchNui('character-create:drag-camera', {
        deltaX,
        deltaY,
      }).catch((error: any) => {
        console.error('[UI] Failed to send drag event:', error);
      });
    },
    [dragState]
  );

  // Handle mouse up / touch end
  const handleDragEnd = useCallback(() => {
    setDragState((prev) => ({
      ...prev,
      isDragging: false,
    }));

    // Send a drag end event to stop any ongoing rotation/zoom
    fetchNui('character-create:drag-end', {}).catch((error: any) => {
      console.error('[UI] Failed to send drag end event:', error);
    });
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleDragStart(e.clientX, e.clientY);
    },
    [handleDragStart]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState.isDragging) return;
      e.preventDefault();

      // Use requestAnimationFrame to throttle the drag events
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        handleDragMove(e.clientX, e.clientY);
      });
    },
    [dragState.isDragging, handleDragMove]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!dragState.isDragging) return;
      e.preventDefault();
      handleDragEnd();
    },
    [dragState.isDragging, handleDragEnd]
  );

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      handleDragStart(touch.clientX, touch.clientY);
    },
    [handleDragStart]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
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
    },
    [dragState.isDragging, handleDragMove]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!dragState.isDragging) return;
      e.preventDefault();
      handleDragEnd();
    },
    [dragState.isDragging, handleDragEnd]
  );

  // Set up and clean up event listeners
  useEffect(() => {
    // Add global mouse/touch event listeners when dragging starts
    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
    }

    // Clean up event listeners
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    dragState.isDragging,
    handleMouseMove,
    handleMouseUp,
    handleTouchMove,
    handleTouchEnd,
  ]);

  return (
    <div
      ref={containerRef}
      className={`${className} cursor-grab ${
        dragState.isDragging ? 'cursor-grabbing' : ''
      }`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-white/70 pointer-events-none">
          <div className="text-2xl mb-2">↔️</div>
          <div className="text-sm">Drag left/right to rotate character</div>
          <div className="mt-4 text-2xl mb-2">↕️</div>
          <div className="text-sm">Drag up/down to zoom camera</div>
        </div>
      </div>
    </div>
  );
};

export default DraggableArea;
