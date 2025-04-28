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
  onRotatePlayer?: (direction: CameraDirection) => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  onRotate,
  onZoom,
  onFocus,
  onRotatePlayer,
}) => {
  return (
    <div className="text-sm w-full">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-on-dark font-semibold mb-2 text-center md:text-left text-xs">
            Camera Controls
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {/* <Button
              onClick={() => onRotate('right')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              ← Move Camera
            </Button>
            <Button
              onClick={() => onRotate('left')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              Move Camera →
            </Button> */}
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

        {onRotatePlayer && (
          <div>
            <h3 className="text-on-dark font-semibold mb-2 text-center md:text-left text-xs">
              Character Rotation
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => onRotatePlayer('left')}
                className="py-1 px-2 text-xs flex justify-center items-center"
              >
                ← Rotate Character
              </Button>
              <Button
                onClick={() => onRotatePlayer('right')}
                className="py-1 px-2 text-xs flex justify-center items-center"
              >
                Rotate Character →
              </Button>
            </div>
          </div>
        )}

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
