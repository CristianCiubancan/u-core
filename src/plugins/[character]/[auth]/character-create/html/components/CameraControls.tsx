import React from 'react';
import Button from '../../../../../../webview/components/ui/Button';
import { MdZoomIn, MdZoomOut } from 'react-icons/md';
import { FaArrowRotateLeft, FaArrowRotateRight } from 'react-icons/fa6';
import { FaFaceSmile, FaPersonHalfDress, FaShoePrints } from 'react-icons/fa6';
import { IconWrapper } from './common';
import {
  CameraDirection,
  ZoomDirection,
  CameraFocus,
} from '../../shared/types';
import { useCharacterData } from '../context/CharacterDataContext';
import { fetchNui } from '../../../../../../webview/utils/fetchNui';

// Keep props interface for backward compatibility
interface CameraControlsProps {
  onRotate?: (direction: CameraDirection) => void;
  onZoom?: (direction: ZoomDirection) => void;
  onFocus?: (focus: CameraFocus) => void;
  onRotatePlayer?: (direction: CameraDirection) => void;
  activeFocus?: CameraFocus;
}

export const CameraControls: React.FC<CameraControlsProps> = (props) => {
  // Get data from context
  const { activeFocus, setActiveFocus } = useCharacterData();

  // Camera zoom handler
  const handleZoom = (direction: ZoomDirection) => {
    if (props.onZoom) {
      props.onZoom(direction);
    } else {
      fetchNui('character-create:zoom-camera', { direction }).catch(
        (error: any) => {
          console.error('[UI] Failed to zoom camera:', error);
        }
      );
    }
  };

  // Camera focus handler
  const handleFocus = (focus: CameraFocus) => {
    if (props.onFocus) {
      props.onFocus(focus);
    } else {
      setActiveFocus(focus);
    }
  };

  // Player rotation handler
  const handleRotatePlayer = (direction: CameraDirection) => {
    if (props.onRotatePlayer) {
      props.onRotatePlayer(direction);
    } else {
      fetchNui('character-create:rotate-player', { direction }).catch(
        (error: any) => {
          console.error('[UI] Failed to rotate player:', error);
        }
      );
    }
  };
  return (
    <div className="text-sm w-full">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-on-dark font-semibold mb-2 text-center md:text-left text-xs">
            Camera Controls
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <Button
              onClick={() => handleZoom('in')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              <IconWrapper className="mr-2">
                <MdZoomIn />
              </IconWrapper>
              Zoom In
            </Button>
            <Button
              onClick={() => handleZoom('out')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              <IconWrapper className="mr-2">
                <MdZoomOut />
              </IconWrapper>
              Zoom Out
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-on-dark font-semibold mb-2 text-center md:text-left text-xs">
            Character Rotation
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <Button
              onClick={() => handleRotatePlayer('left')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              <IconWrapper className="mr-2">
                <FaArrowRotateLeft />
              </IconWrapper>
              Rotate Left
            </Button>
            <Button
              onClick={() => handleRotatePlayer('right')}
              className="py-1 px-2 text-xs flex justify-center items-center"
            >
              <IconWrapper className="mr-2">
                <FaArrowRotateRight />
              </IconWrapper>
              Rotate Right
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-on-dark font-semibold mb-2 text-center md:text-left text-xs">
            Focus
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <Button
              onClick={() => handleFocus('head')}
              className={`py-1 px-2 text-xs flex justify-center items-center ${
                activeFocus === 'head' ? 'glass-brand' : 'glass-brand-dark'
              }`}
            >
              <IconWrapper className="mr-2">
                <FaFaceSmile />
              </IconWrapper>
              Head
            </Button>
            <Button
              onClick={() => handleFocus('body')}
              className={`py-1 px-2 text-xs flex justify-center items-center ${
                activeFocus === 'body' ? 'glass-brand' : 'glass-brand-dark'
              }`}
            >
              <IconWrapper className="mr-2">
                <FaPersonHalfDress />
              </IconWrapper>
              Body
            </Button>
            <Button
              onClick={() => handleFocus('legs')}
              className={`py-1 px-2 text-xs flex justify-center items-center ${
                activeFocus === 'legs' ? 'glass-brand' : 'glass-brand-dark'
              }`}
            >
              <IconWrapper className="mr-2">
                <FaShoePrints />
              </IconWrapper>
              Legs
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
