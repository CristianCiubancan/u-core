/**
 * Shared types for character creation
 * This file contains all type definitions used across client and UI
 */

// Constants
export const NUI_EVENT = 'character-create:toggle-ui';

// Character model options
export const MODELS = [
  { id: 'mp_m_freemode_01', label: 'Male' },
  { id: 'mp_f_freemode_01', label: 'Female' },
];

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
 * Interface for appearance overlay items
 */
export interface AppearanceOverlay {
  style: number;
  color?: number;
  opacity: number;
}

/**
 * Interface for facial appearance data
 */
export interface AppearanceData {
  eyebrows: AppearanceOverlay;
  beard: AppearanceOverlay;
  eyeColor: number;
  blemishes: AppearanceOverlay;
  ageing: AppearanceOverlay;
  complexion: AppearanceOverlay;
  moles: AppearanceOverlay;
  sunDamage: AppearanceOverlay;
  makeUp: AppearanceOverlay;
  lipstick: AppearanceOverlay;
  [key: string]: AppearanceOverlay | number;
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
 * Default character data
 */
export const DEFAULT_CHARACTER: CharacterData = {
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
    eyebrows: { style: 0, color: 0, opacity: 1.0 },
    beard: { style: 0, color: 0, opacity: 1.0 },
    eyeColor: 0,
    blemishes: { style: 0, opacity: 0.0 },
    ageing: { style: 0, opacity: 0.0 },
    complexion: { style: 0, opacity: 0.0 },
    moles: { style: 0, opacity: 0.0 },
    sunDamage: { style: 0, opacity: 0.0 },
    makeUp: { style: 0, color: 0, opacity: 0.0 },
    lipstick: { style: 0, color: 0, opacity: 0.0 },
  },
  clothing: {
    torso: 0,
    torsoTexture: 0,
    legs: 0,
    legsTexture: 0,
    shoes: 0,
    shoesTexture: 0,
    accessories: 0,
    accessoriesTexture: 0,
    undershirt: 0,
    undershirtTexture: 0,
    tops: 0,
    topsTexture: 0,
  },
};

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
 * Tab types for UI
 */
export type TabType = 'model' | 'face' | 'hair' | 'appearance' | 'clothing';

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

export interface PlayerRotationData {
  direction: CameraDirection;
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
