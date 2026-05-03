// Direct port of qb-core/shared/main.lua. Pure data + pure utility
// functions only; the vehicle-extras helpers (ChangeVehicleExtra,
// SetDefaultVehicleExtras) and the GetShared export depend on FiveM
// natives / runtime context, so they live with the client/server
// implementations in Phase 2/3.

export interface StarterItem {
  amount: number;
  item: string;
}

/** Items every freshly-created character is given. Mirrors
 *  `QBShared.StarterItems`. */
export const StarterItems: Record<string, StarterItem> = {
  phone: { amount: 1, item: 'phone' },
  id_card: { amount: 1, item: 'id_card' },
  driver_license: { amount: 1, item: 'driver_license' },
};

const STRING_CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const NUMBER_CHARSET = '0123456789';

/** Random uppercase/lowercase ASCII string of `length` characters.
 *  Mirrors `QBShared.RandomStr`. */
export function RandomStr(length: number): string {
  if (length <= 0) return '';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += STRING_CHARSET.charAt(
      Math.floor(Math.random() * STRING_CHARSET.length)
    );
  }
  return out;
}

/** Random digit string of `length` characters. Mirrors
 *  `QBShared.RandomInt`. */
export function RandomInt(length: number): string {
  if (length <= 0) return '';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += NUMBER_CHARSET.charAt(
      Math.floor(Math.random() * NUMBER_CHARSET.length)
    );
  }
  return out;
}

/** Split `str` on `delimiter`, no regex. Mirrors `QBShared.SplitStr`. */
export function SplitStr(str: string, delimiter: string): string[] {
  return str.split(delimiter);
}

/** Trim leading/trailing whitespace. Returns `null` for nullish input
 *  to match the Lua signature. Mirrors `QBShared.Trim`. */
export function Trim(value: string | null | undefined): string | null {
  if (value == null) return null;
  return value.replace(/^\s+|\s+$/g, '');
}

/** Capitalize first character. Returns `null` for nullish input.
 *  Mirrors `QBShared.FirstToUpper`. */
export function FirstToUpper(value: string | null | undefined): string | null {
  if (value == null) return null;
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Round half-up to `numDecimalPlaces` decimals (default 0). Mirrors
 *  `QBShared.Round`. */
export function Round(value: number, numDecimalPlaces?: number): number {
  if (numDecimalPlaces == null) return Math.floor(value + 0.5);
  const power = Math.pow(10, numDecimalPlaces);
  return Math.floor(value * power + 0.5) / power;
}

/** Component-id sets used by qb-clothing to detect when a male/female
 *  ped variant has no gloves rendered (so accessory swap logic can
 *  skip glove-strip steps). Lua keys are integer ped component
 *  variants; preserve as numeric keys. */
export const MaleNoGloves: Record<number, true> = {
  0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true,
  8: true, 9: true, 10: true, 11: true, 12: true, 13: true, 14: true, 15: true,
  18: true, 26: true, 52: true, 53: true, 54: true, 55: true, 56: true,
  57: true, 58: true, 59: true, 60: true, 61: true, 62: true, 112: true,
  113: true, 114: true, 118: true, 125: true, 132: true,
};

export const FemaleNoGloves: Record<number, true> = {
  0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true,
  8: true, 9: true, 10: true, 11: true, 12: true, 13: true, 14: true, 15: true,
  19: true, 59: true, 60: true, 61: true, 62: true, 63: true, 64: true,
  65: true, 66: true, 67: true, 68: true, 69: true, 70: true, 71: true,
  129: true, 130: true, 131: true, 135: true, 142: true, 149: true, 153: true,
  157: true, 161: true, 165: true,
};

/** Detects values that crossed the Lua/JS boundary as function refs.
 *  Lua functions reach JS as objects with a `__cfx_functionReference`
 *  string field; native JS functions just have `typeof === 'function'`.
 *  Mirrors `QBShared.IsFunction`. */
export function IsFunction(value: unknown): boolean {
  if (typeof value === 'object' && value !== null) {
    const ref = (value as { __cfx_functionReference?: unknown })
      .__cfx_functionReference;
    return typeof ref === 'string';
  }
  return typeof value === 'function';
}

// `ChangeVehicleExtra` and `SetDefaultVehicleExtras` use FiveM client
// natives (DoesExtraExist / SetVehicleExtra / IsVehicleExtraTurnedOn)
// that don't exist on the server — same as upstream, where calling
// these from a server context errors. We expose them via the client
// Shared namespace at boot (see client/qbcore.ts) rather than here so
// the type isn't polluted with `declare const` ambient natives in a
// shared module.
