// Mirror of the original config.lua — same constant names, same values.
// Imported directly by client/index.ts and server/index.ts; esbuild
// inlines into each bundle, so there is no separate `shared_scripts`
// entry on the manifest.

export interface XYZ {
  x: number;
  y: number;
  z: number;
}

export interface XYZW extends XYZ {
  w: number;
}

export interface PlayerCharLimit {
  license: string;
  numberOfChars: number;
}

export interface MultiCharacterConfig {
  Interior: XYZ;
  DefaultSpawn: XYZ;
  PedCoords: XYZW;
  HiddenCoords: XYZW;
  CamCoords: XYZW;
  EnableDeleteButton: boolean;
  customNationality: boolean;
  SkipSelection: boolean;
  DefaultNumberOfCharacters: number;
  PlayersNumberOfCharacters: PlayerCharLimit[];
}

export const Config: MultiCharacterConfig = {
  Interior: { x: -763.2816, y: 330.0418, z: 199.4865 },
  DefaultSpawn: { x: -1035.71, y: -2731.87, z: 12.86 },
  PedCoords: { x: -763.2816, y: 330.0418, z: 199.4865, w: 177.7942 },
  HiddenCoords: { x: -779.0154, y: 326.1801, z: 196.086, w: 91.0454 },
  // Original w was 357 (camera dead-center on ped). Rotated ~20° clockwise
  // (yaw 337) so the ped renders on the left third of the viewport, leaving
  // the right side clear for the dossier card. Position kept the same.
  CamCoords: { x: -763.1219, y: 326.8112, z: 200, w: 337.0954 },
  EnableDeleteButton: true,
  customNationality: false,
  SkipSelection: false,
  DefaultNumberOfCharacters: 5,
  PlayersNumberOfCharacters: [],
};
