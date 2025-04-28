import { CharacterData, CameraFocus } from '../types/types';

// UI State
export let uiVisible = false;

// Camera state variables
export let cameraRotation = 0;
export let cameraZoom = 1.5;
export let cameraFocus: CameraFocus = 'body';
export let characterCreationCamera: number | null = null;

// Default character data
export const characterData: CharacterData = {
  model: 'mp_m_freemode_01',
  face: {
    fatherIndex: 0,
    motherIndex: 0,
    shapeMix: 0.5,
    skinMix: 0.5,
  },
  hair: {
    style: 0,
    color: 0,
    highlight: 0,
  },
  appearance: {
    eyebrows: {
      style: 0,
      color: 0,
    },
    beard: {
      style: 0,
      color: 0,
    },
    eyeColor: 0,
  },
  clothing: {
    tops: 0,
    topsTexture: 0,
    torso: 0,
    torsoTexture: 0,
    undershirt: 0,
    undershirtTexture: 0,
    legs: 0,
    legsTexture: 0,
    shoes: 0,
    shoesTexture: 0,
    accessories: 0,
    accessoriesTexture: 0,
  },
};

// Function to update UI visibility state
export function setUiVisible(visible: boolean): void {
  uiVisible = visible;
}

// Functions to update camera state
export function setCameraRotation(rotation: number): void {
  cameraRotation = rotation;
}

export function setCameraZoom(zoom: number): void {
  cameraZoom = zoom;
}

export function setCameraFocus(focus: CameraFocus): void {
  cameraFocus = focus;
}

export function setCharacterCreationCamera(camera: number | null): void {
  characterCreationCamera = camera;
}
