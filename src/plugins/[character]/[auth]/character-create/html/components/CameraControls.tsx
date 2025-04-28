import React from 'react';
import Button from '../../../../../../webview/components/ui/Button';
import {
  CameraDirection,
  ZoomDirection,
  CameraFocus,
} from '../../shared/types';

interface CameraControlsProps {
  onRotate: (direction: CameraDirection) => void;
  onZoom: (direction: ZoomDirection) => void;
  onFocus: (focus: CameraFocus) => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  onRotate,
  onZoom,
  onFocus,
}) => {
  return (
    <div className="text-sm w-full">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-on-dark font-semibold mb-2 text-center md:text-left text-xs">
            Camera Controls
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onRotate('right')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              ← Rotate
            </Button>
            <Button
              onClick={() => onRotate('left')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              Rotate →
            </Button>
            <Button
              onClick={() => onZoom('in')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              Zoom In
            </Button>
            <Button
              onClick={() => onZoom('out')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              Zoom Out
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-on-dark font-semibold mb-2 text-center md:text-left text-xs">
            Focus
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => onFocus('head')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              Head
            </Button>
            <Button
              onClick={() => onFocus('body')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              Body
            </Button>
            <Button
              onClick={() => onFocus('legs')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              Legs
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
