import React from 'react';
import Button from '../../../../../../webview/components/ui/Button';

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
              onClick={() => onRotate('right')}
              className="py-1 px-2 text-xs flex justify-center items-center glass-brand-dark"
            >
              ← Rotate
            </Button>
            <Button
              onClick={() => onRotate('left')}
              className="py-1 px-2 text-xs flex justify-center items-center glass-brand-dark"
            >
              Rotate →
            </Button>
            <Button
              onClick={() => onZoom('in')}
              className="py-1 px-2 text-xs flex justify-center items-center glass-brand-dark"
            >
              Zoom In
            </Button>
            <Button
              onClick={() => onZoom('out')}
              className="py-1 px-2 text-xs flex justify-center items-center glass-brand-dark"
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
                onClick={() => onFocus('head')}
                className="py-1 px-2 text-xs flex justify-center items-center glass-brand-dark"
              >
                Head
              </Button>
              <Button
                onClick={() => onFocus('body')}
                className="py-1 px-2 text-xs flex justify-center items-center glass-brand-dark"
              >
                Body
              </Button>
              <Button
                onClick={() => onFocus('legs')}
                className="py-1 px-2 text-xs flex justify-center items-center glass-brand-dark"
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
