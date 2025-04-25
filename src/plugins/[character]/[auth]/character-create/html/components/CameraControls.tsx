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
    <div className="text-sm w-full">
      <div className="flex flex-col">
        <div className="mb-2 md:mb-0">
          <h3 className="text-primary font-semibold mb-2 text-center md:text-left text-xs">
            Camera Controls
          </h3>
          <div className="flex space-x-2">
            <Button
              variant="secondary"
              onClick={() => onRotate('left')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              ← Rotate
            </Button>
            <Button
              variant="secondary"
              onClick={() => onRotate('right')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              Rotate →
            </Button>
            <Button
              variant="secondary"
              onClick={() => onZoom('in')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              Zoom In
            </Button>
            <Button
              variant="secondary"
              onClick={() => onZoom('out')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              Zoom Out
            </Button>
          </div>

          <div>
            <h3 className="text-primary font-semibold mb-2 text-center md:text-left text-xs">
              Focus
            </h3>
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                onClick={() => onFocus('head')}
                className="py-1 px-2 text-xs flex justify-center items-center"
              >
                Head
              </Button>
              <Button
                variant="secondary"
                onClick={() => onFocus('body')}
                className="py-1 px-2 text-xs flex justify-center items-center"
              >
                Body
              </Button>
              <Button
                variant="secondary"
                onClick={() => onFocus('legs')}
                className="py-1 px-2 text-xs flex justify-center items-center"
              >
                Legs
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
