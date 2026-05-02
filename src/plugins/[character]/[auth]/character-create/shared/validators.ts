/**
 * Runtime payload validators for the character-create NUI callbacks and
 * NetEvent boundary. Uses ajv to keep the validator stack consistent with
 * `FileManager`'s manifest validation (PR-04). Schemas are intentionally
 * strict: unknown properties are rejected so a malformed/hostile client
 * cannot smuggle extra fields past the boundary.
 *
 * `update-appearance.category` is allowlisted against the concrete keys of
 * `AppearanceData` (no `[key: string]` index abuse). `update-model.model`
 * is allowlisted against `MODELS`. Values are bounded to plausible
 * ranges so a single garbage payload cannot stall the client by spinning
 * `RequestModel` forever or crash native shims with non-finite numbers.
 */

import { Ajv, type SchemaObject, type ValidateFunction } from 'ajv';
import {
  MODELS,
  type AppearanceUpdateData,
  type CameraDragData,
  type CameraFocusData,
  type CameraRotationData,
  type CameraZoomData,
  type CharacterData,
  type ClothingUpdateData,
  type FaceUpdateData,
  type HairUpdateData,
  type ModelUpdateData,
  type PlayerRotationData,
  type SaveCharacterData,
} from './types';

const ajv = new Ajv({ allErrors: true, strict: false });

const APPEARANCE_KEYS = [
  'eyebrows',
  'beard',
  'eyeColor',
  'blemishes',
  'ageing',
  'complexion',
  'moles',
  'sunDamage',
  'makeUp',
  'lipstick',
] as const;

const FACE_KEYS = ['fatherIndex', 'motherIndex', 'shapeMix', 'skinMix'];

const HAIR_KEYS = ['style', 'color', 'highlight'];

const CLOTHING_KEYS = [
  'tops',
  'topsTexture',
  'torso',
  'torsoTexture',
  'undershirt',
  'undershirtTexture',
  'legs',
  'legsTexture',
  'shoes',
  'shoesTexture',
  'accessories',
  'accessoriesTexture',
  'mask',
  'maskTexture',
  'bags',
  'bagsTexture',
  'armor',
  'armorTexture',
  'decals',
  'decalsTexture',
];

const MODEL_IDS = MODELS.map((m) => m.id);

const overlaySchema: SchemaObject = {
  type: 'object',
  required: ['style', 'opacity'],
  additionalProperties: false,
  properties: {
    style: { type: 'integer', minimum: 0, maximum: 1024 },
    color: { type: 'integer', minimum: 0, maximum: 1024 },
    opacity: { type: 'number', minimum: 0, maximum: 1 },
  },
};

const faceDataSchema: SchemaObject = {
  type: 'object',
  required: ['fatherIndex', 'motherIndex', 'shapeMix', 'skinMix'],
  additionalProperties: false,
  properties: {
    fatherIndex: { type: 'integer', minimum: 0, maximum: 45 },
    motherIndex: { type: 'integer', minimum: 0, maximum: 45 },
    shapeMix: { type: 'number', minimum: 0, maximum: 1 },
    skinMix: { type: 'number', minimum: 0, maximum: 1 },
  },
};

const hairDataSchema: SchemaObject = {
  type: 'object',
  required: ['style', 'color', 'highlight'],
  additionalProperties: false,
  properties: {
    style: { type: 'integer', minimum: 0, maximum: 1024 },
    color: { type: 'integer', minimum: 0, maximum: 1024 },
    highlight: { type: 'integer', minimum: 0, maximum: 1024 },
  },
};

const appearanceDataSchema: SchemaObject = {
  type: 'object',
  required: [
    'eyebrows',
    'beard',
    'eyeColor',
    'blemishes',
    'ageing',
    'complexion',
    'moles',
    'sunDamage',
    'makeUp',
    'lipstick',
  ],
  additionalProperties: false,
  properties: {
    eyebrows: overlaySchema,
    beard: overlaySchema,
    eyeColor: { type: 'integer', minimum: 0, maximum: 1024 },
    blemishes: overlaySchema,
    ageing: overlaySchema,
    complexion: overlaySchema,
    moles: overlaySchema,
    sunDamage: overlaySchema,
    makeUp: overlaySchema,
    lipstick: overlaySchema,
  },
};

const clothingDataSchema: SchemaObject = {
  type: 'object',
  required: [
    'tops',
    'topsTexture',
    'torso',
    'torsoTexture',
    'undershirt',
    'undershirtTexture',
    'legs',
    'legsTexture',
    'shoes',
    'shoesTexture',
    'accessories',
    'accessoriesTexture',
  ],
  additionalProperties: false,
  properties: Object.fromEntries(
    CLOTHING_KEYS.map((k) => [k, { type: 'integer', minimum: 0, maximum: 1024 }])
  ),
};

const propsDataSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  properties: Object.fromEntries(
    [
      'hat',
      'hatTexture',
      'glasses',
      'glassesTexture',
      'ears',
      'earsTexture',
      'watches',
      'watchesTexture',
      'bracelets',
      'braceletsTexture',
    ].map((k) => [k, { type: 'integer', minimum: 0, maximum: 1024 }])
  ),
};

const characterDataSchema: SchemaObject = {
  type: 'object',
  required: ['model', 'face', 'hair', 'appearance', 'clothing'],
  additionalProperties: false,
  properties: {
    model: { type: 'string', enum: MODEL_IDS },
    face: faceDataSchema,
    hair: hairDataSchema,
    appearance: appearanceDataSchema,
    clothing: clothingDataSchema,
    props: propsDataSchema,
  },
};

const toggleUiSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  properties: {
    close: { type: 'boolean' },
    save: { type: 'boolean' },
    characterData: characterDataSchema,
  },
};

const modelUpdateSchema: SchemaObject = {
  type: 'object',
  required: ['model'],
  additionalProperties: false,
  properties: {
    model: { type: 'string', enum: MODEL_IDS },
  },
};

const faceUpdateSchema: SchemaObject = {
  type: 'object',
  required: ['key', 'value'],
  additionalProperties: false,
  properties: {
    key: { type: 'string', enum: FACE_KEYS },
    value: { type: 'number' },
  },
};

const hairUpdateSchema: SchemaObject = {
  type: 'object',
  required: ['key', 'value'],
  additionalProperties: false,
  properties: {
    key: { type: 'string', enum: HAIR_KEYS },
    value: { type: 'integer', minimum: 0, maximum: 1024 },
  },
};

const appearanceUpdateSchema: SchemaObject = {
  type: 'object',
  required: ['category', 'key', 'value'],
  additionalProperties: false,
  properties: {
    category: { type: 'string', enum: [...APPEARANCE_KEYS] },
    key: { type: 'string', enum: ['style', 'color', 'opacity'] },
    value: { type: 'number' },
  },
};

const clothingUpdateSchema: SchemaObject = {
  type: 'object',
  required: ['key', 'value'],
  additionalProperties: false,
  properties: {
    key: { type: 'string', enum: CLOTHING_KEYS },
    value: { type: 'integer', minimum: 0, maximum: 1024 },
  },
};

const cameraDirectionSchema: SchemaObject = {
  type: 'object',
  required: ['direction'],
  additionalProperties: false,
  properties: { direction: { type: 'string', enum: ['left', 'right'] } },
};

const cameraZoomSchema: SchemaObject = {
  type: 'object',
  required: ['direction'],
  additionalProperties: false,
  properties: { direction: { type: 'string', enum: ['in', 'out'] } },
};

const cameraFocusSchema: SchemaObject = {
  type: 'object',
  required: ['focus'],
  additionalProperties: false,
  properties: { focus: { type: 'string', enum: ['head', 'body', 'legs'] } },
};

const cameraDragSchema: SchemaObject = {
  type: 'object',
  required: ['deltaX', 'deltaY'],
  additionalProperties: false,
  properties: {
    deltaX: { type: 'number', minimum: -1e4, maximum: 1e4 },
    deltaY: { type: 'number', minimum: -1e4, maximum: 1e4 },
  },
};

const dragEndSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  properties: {},
};

export const validateCharacterData: ValidateFunction<CharacterData> =
  ajv.compile<CharacterData>(characterDataSchema);
export const validateToggleUi: ValidateFunction<SaveCharacterData> =
  ajv.compile<SaveCharacterData>(toggleUiSchema);
export const validateModelUpdate: ValidateFunction<ModelUpdateData> =
  ajv.compile<ModelUpdateData>(modelUpdateSchema);
export const validateFaceUpdate: ValidateFunction<FaceUpdateData> =
  ajv.compile<FaceUpdateData>(faceUpdateSchema);
export const validateHairUpdate: ValidateFunction<HairUpdateData> =
  ajv.compile<HairUpdateData>(hairUpdateSchema);
export const validateAppearanceUpdate: ValidateFunction<AppearanceUpdateData> =
  ajv.compile<AppearanceUpdateData>(appearanceUpdateSchema);
export const validateClothingUpdate: ValidateFunction<ClothingUpdateData> =
  ajv.compile<ClothingUpdateData>(clothingUpdateSchema);
export const validateCameraRotation: ValidateFunction<CameraRotationData> =
  ajv.compile<CameraRotationData>(cameraDirectionSchema);
export const validateCameraZoom: ValidateFunction<CameraZoomData> =
  ajv.compile<CameraZoomData>(cameraZoomSchema);
export const validateCameraFocus: ValidateFunction<CameraFocusData> =
  ajv.compile<CameraFocusData>(cameraFocusSchema);
export const validatePlayerRotation: ValidateFunction<PlayerRotationData> =
  ajv.compile<PlayerRotationData>(cameraDirectionSchema);
export const validateCameraDrag: ValidateFunction<CameraDragData> =
  ajv.compile<CameraDragData>(cameraDragSchema);
export const validateDragEnd: ValidateFunction<Record<string, never>> =
  ajv.compile<Record<string, never>>(dragEndSchema);

/**
 * Format ajv errors into a single-line audit string. Limited length so a
 * caller logging a flood of bad payloads doesn't spam the server console.
 */
export function formatValidationErrors(
  errors: ValidateFunction['errors']
): string {
  if (!errors || errors.length === 0) return '(no errors reported)';
  return errors
    .slice(0, 5)
    .map((e) => `${e.instancePath || '/'} ${e.message ?? 'invalid'}`)
    .join('; ');
}
