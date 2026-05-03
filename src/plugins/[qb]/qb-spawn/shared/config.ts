// Mirror of the original config.lua — same constant shape, same values.
// `QB.Spawns` in the upstream Lua is keyed by location id; we keep that
// object shape so the wire format with the UI (which sends back the
// location key as `posname`) stays identical.

export interface XYZW {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface SpawnLocation {
  /** Same string as the object key — preserved so handlers can read it
   *  off the value alone without a key→value lookup. */
  location: string;
  coords: XYZW;
  label: string;
}

export type SpawnLocationMap = Record<string, SpawnLocation>;

export const Spawns: SpawnLocationMap = {
  legion: {
    coords: { x: 195.17, y: -933.77, z: 29.7, w: 144.5 },
    location: 'legion',
    label: 'Legion Square',
  },
  policedp: {
    coords: { x: 428.23, y: -984.28, z: 29.76, w: 3.5 },
    location: 'policedp',
    label: 'Police Department',
  },
  paleto: {
    coords: { x: 80.35, y: 6424.12, z: 31.67, w: 45.5 },
    location: 'paleto',
    label: 'Paleto Bay',
  },
  motel: {
    coords: { x: 327.56, y: -205.08, z: 53.08, w: 163.5 },
    location: 'motel',
    label: 'Motels',
  },
};
