// Shapes shared between client and the React webview. The wire format
// must match upstream qb-spawn so other plugins (notably qb-apartments
// for the new-character flow) can still feed us their data unchanged.

import type { SpawnLocationMap } from './config';

/** A house owned by the player, surfaced to the UI alongside the
 *  preset spawns. `house` is the house id (used as the cam target);
 *  `label` is the address shown to the player. */
export interface OwnedHouse {
  house: string;
  label: string;
}

/** Apartment options surfaced when the player is choosing a spawn for
 *  a brand-new character. The shape mirrors `Apartments.Locations[id]`
 *  from qb-apartments so we can pass it through verbatim. */
export interface ApartmentOption {
  /** Apartment id, used as `appType` when spawning. */
  id: string;
  label: string;
}

export type ApartmentOptionMap = Record<string, ApartmentOption>;

/** UI inbound message. `setupLocations` runs for the existing-character
 *  flow (preset spawns + owned houses); `setupAppartements` runs for
 *  brand-new characters who must pick a starter apartment.
 *
 *  `firstSpawn` is a u-core extension: qb-multicharacter sets
 *  `cData._firstSpawn = true` on createCharacter, qb-apartments forwards
 *  cData unchanged, and qb-spawn's client surfaces it here. The UI uses
 *  it to suppress "Last Location" for a brand-new character (whose
 *  `position` still points at the createPed interior) regardless of
 *  what `isNew` says — `isNew` only flips for the
 *  Apartments.Starting=true branch, but the position-is-meaningless
 *  problem applies to both branches of new-character flow. */
export type SpawnSetupMessage =
  | {
      action: 'setupLocations';
      locations: SpawnLocationMap;
      houses: OwnedHouse[];
      isNew: false;
      firstSpawn?: boolean;
    }
  | {
      action: 'setupAppartements';
      locations: ApartmentOptionMap;
      isNew: true;
      firstSpawn?: boolean;
    };

export interface SpawnShowUiMessage {
  action: 'showUi';
  status: boolean;
}

/** Selected entry the user submits to the client. Type is one of:
 *  - `current`: spawn at last location (existing chars only)
 *  - `normal`: a preset Spawns[name] entry
 *  - `house`: an owned house id
 *  - `appartment`: an apartment id (new char flow) — note the
 *    intentional double-p; matches upstream wire format. */
export type SpawnPickType = 'current' | 'normal' | 'house' | 'appartment';

export interface SpawnPick {
  type: SpawnPickType;
  /** Location key for `normal`/`house`/`appartment`; ignored for
   *  `current` (no further disambiguation needed). */
  name: string;
}
