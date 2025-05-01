import React, { useCallback, useRef } from 'react';
import { fetchNui } from '../../../../../../webview/utils/fetchNui';
import { useDrag } from '../hooks';

interface DraggableAreaProps {
  className?: string;
}

const DraggableArea: React.FC<DraggableAreaProps> = ({ className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Define drag handlers
  const handleDragMove = useCallback((deltaX: number, deltaY: number) => {
    // Send the drag event to the client
    // We'll use deltaX for character rotation and deltaY for camera zoom
    fetchNui('character-create:drag-camera', {
      deltaX,
      deltaY,
    }).catch((error: any) => {
      console.error('[UI] Failed to send drag event:', error);
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    // Send a drag end event to stop any ongoing rotation/zoom
    fetchNui('character-create:drag-end', {}).catch((error: any) => {
      console.error('[UI] Failed to send drag end event:', error);
    });
  }, []);

  // Use our custom drag hook
  const { isDragging, hasEverDragged, handleMouseDown, handleTouchStart } = useDrag({
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
  });

  return (
    <div
      ref={containerRef}
      className={`${className} cursor-grab ${
        isDragging ? 'cursor-grabbing' : ''
      }`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {!hasEverDragged && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-white/70 pointer-events-none">
            <div className="text-2xl mb-2">↔️</div>
            <div className="text-sm">Drag left/right to rotate character</div>
            <div className="mt-4 text-2xl mb-2">↕️</div>
            <div className="text-sm">Drag up/down to zoom camera</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraggableArea;
