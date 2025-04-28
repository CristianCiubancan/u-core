// ../types/types.ts

/**
 * Interface for character face data
 */
export interface FaceData {
  fatherIndex: number;
  motherIndex: number;
  shapeMix: number;
  skinMix: number;
}

/**
 * Interface for character hair data
 */
export interface HairData {
  style: number;
  color: number;
  highlight: number;
}

/**
 * Interface for facial appearance data
 */
export interface AppearanceData {
  eyebrows: {
    style: number;
    color: number;
    opacity?: number;
  };
  beard: {
    style: number;
    color: number;
    opacity?: number;
  };
  eyeColor: number;
  // Add more facial features as needed
  blemishes?: {
    style: number;
    opacity: number;
  };
  ageing?: {
    style: number;
    opacity: number;
  };
  complexion?: {
    style: number;
    opacity: number;
  };
  // and so on...
}

/**
 * Interface for character clothing data
 */
export interface ClothingData {
  tops: number;
  topsTexture: number;
  torso: number;
  torsoTexture: number;
  undershirt: number;
  undershirtTexture: number;
  legs: number;
  legsTexture: number;
  shoes: number;
  shoesTexture: number;
  accessories: number;
  accessoriesTexture: number;
  mask?: number;
  maskTexture?: number;
  bags?: number;
  bagsTexture?: number;
  armor?: number;
  armorTexture?: number;
  decals?: number;
  decalsTexture?: number;
}

/**
 * Interface for character props (accessories)
 */
export interface PropData {
  hat?: number;
  hatTexture?: number;
  glasses?: number;
  glassesTexture?: number;
  ears?: number;
  earsTexture?: number;
  watches?: number;
  watchesTexture?: number;
  bracelets?: number;
  braceletsTexture?: number;
}

/**
 * Interface for complete character data
 */
export interface CharacterData {
  model: string;
  face: FaceData;
  hair: HairData;
  appearance: AppearanceData;
  clothing: ClothingData;
  props?: PropData;
}

/**
 * Camera focus position types
 */
export type CameraFocus = 'head' | 'body' | 'legs';

/**
 * Camera direction types
 */
export type CameraDirection = 'left' | 'right';

/**
 * Camera zoom direction types
 */
export type ZoomDirection = 'in' | 'out';

/**
 * Component map type for clothing components
 */
export interface ComponentMap {
  [key: string]: number;
}

/**
 * NUI callback data for various character customization events
 */
export interface ModelUpdateData {
  model: string;
}

export interface FaceUpdateData {
  key: keyof FaceData;
  value: number;
}

export interface HairUpdateData {
  key: keyof HairData;
  value: number;
}

export interface AppearanceUpdateData {
  category: keyof AppearanceData;
  key: string;
  value: number;
}

export interface ClothingUpdateData {
  key: keyof ClothingData;
  value: number;
}

export interface CameraRotationData {
  direction: CameraDirection;
}

export interface CameraZoomData {
  direction: ZoomDirection;
}

export interface CameraFocusData {
  focus: CameraFocus;
}

export interface SaveCharacterData {
  close?: boolean;
  save?: boolean;
  characterData?: CharacterData;
}

/**
 * Utility type for NUI callbacks
 */
export type NuiCallback<T> = (data: T, cb: (response: any) => void) => void;
