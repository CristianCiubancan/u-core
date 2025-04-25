// Define types for character data
export interface AppearanceOverlay {
  style: number;
  color?: number;
  opacity: number;
}

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

export interface CharacterData {
  model: string;
  face: {
    fatherIndex: number;
    motherIndex: number;
    shapeMix: number;
    skinMix: number;
  };
  hair: {
    style: number;
    color: number;
    highlight: number;
  };
  appearance: AppearanceData;
  clothing: {
    torso: number;
    torsoTexture: number;
    legs: number;
    legsTexture: number;
    shoes: number;
    shoesTexture: number;
    accessories: number;
    accessoriesTexture: number;
    undershirt: number;
    undershirtTexture: number;
    tops: number;
    topsTexture: number;
  };
}

// Character model options
export const MODELS = [
  { id: 'mp_m_freemode_01', label: 'Male' },
  { id: 'mp_f_freemode_01', label: 'Female' },
];

// Default character data
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

// Constants
export const NUI_EVENT = 'character-create:toggle-ui';

// Tab types
export type TabType = 'model' | 'face' | 'hair' | 'appearance' | 'clothing';
