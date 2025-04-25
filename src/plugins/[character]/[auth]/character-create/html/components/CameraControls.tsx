import React from 'react';
import { Button } from './Button';

interface CameraControlsProps {
  onRotate: (direction: 'left' | 'right') => void;
  onZoom: (direction: 'in' | 'out') => void;
  onFocus: (focus: 'head' | 'body' | 'legs') => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  onRotate,
  onZoom,
  onFocus,
}) => {
  return (
    <div className="glass p-2 rounded-lg text-sm">
      <h3 className="text-primary font-semibold mb-2 text-center text-xs">
        Camera
      </h3>
      <div className="grid grid-cols-2 gap-1">
        <Button
          variant="secondary"
          onClick={() => onRotate('left')}
          className="py-1 px-2 text-xs"
        >
          ← Rotate
        </Button>
        <Button
          variant="secondary"
          onClick={() => onRotate('right')}
          className="py-1 px-2 text-xs"
        >
          Rotate →
        </Button>
        <Button
          variant="secondary"
          onClick={() => onZoom('in')}
          className="py-1 px-2 text-xs"
        >
          Zoom In
        </Button>
        <Button
          variant="secondary"
          onClick={() => onZoom('out')}
          className="py-1 px-2 text-xs"
        >
          Zoom Out
        </Button>
      </div>

      <h3 className="text-primary font-semibold mt-3 mb-2 text-center text-xs">
        Focus
      </h3>
      <div className="grid grid-cols-3 gap-1">
        <Button
          variant="secondary"
          onClick={() => onFocus('head')}
          className="py-1 px-1 text-xs"
        >
          Head
        </Button>
        <Button
          variant="secondary"
          onClick={() => onFocus('body')}
          className="py-1 px-1 text-xs"
        >
          Body
        </Button>
        <Button
          variant="secondary"
          onClick={() => onFocus('legs')}
          className="py-1 px-1 text-xs"
        >
          Legs
        </Button>
      </div>
    </div>
  );
};
