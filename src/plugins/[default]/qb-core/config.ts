/// <reference types="@citizenfx/server" />

// Direct port of qb-core/config.lua. Static values only for Phase 2a;
// `PlayerDefaults` (which has lazy-evaluated factory functions for
// citizenid, phone, account, fingerprint, walletid, serial, bloodtype)
// is exposed as a PlayerDefaultsFactory that accepts the runtime
// helpers as args once Player.CreatePlayer is ported in Phase 2c.

import type { XYZW } from './shared/locations';

export interface MoneyConfig {
  /** Initial balance per money type. Add/remove keys to introduce
   *  custom money buckets — once added they persist in the DB. */
  MoneyTypes: Record<string, number>;
  /** Money types that cannot go negative under any circumstance. */
  DontAllowMinus: string[];
  /** Floor below which removals fail even for types not in
   *  DontAllowMinus. */
  MinusLimit: number;
  /** Paycheck interval in minutes. */
  PayCheckTimeOut: number;
  /** When true paycheck is debited from the player's society account
   *  (requires qb-management). When false it's printed money. */
  PayCheckSociety: boolean;
}

export interface PlayerSubConfig {
  HungerRate: number;
  ThirstRate: number;
  Bloodtypes: readonly string[];
}

export interface ServerSubConfig {
  Closed: boolean;
  ClosedReason: string;
  Uptime: number;
  Whitelist: boolean;
  WhitelistPermission: string;
  PVP: boolean;
  Discord: string;
  CheckDuplicateLicense: boolean;
  Permissions: readonly string[];
}

export interface CommandsSubConfig {
  /** RGB triple used for /me and OOC chat. */
  OOCColor: readonly [number, number, number];
}

export interface NotifyVariant {
  classes: string;
  icon: string;
}

export interface NotifySubConfig {
  NotificationStyling: {
    group: boolean;
    position:
      | 'top-left'
      | 'top-right'
      | 'bottom-left'
      | 'bottom-right'
      | 'top'
      | 'bottom'
      | 'left'
      | 'right'
      | 'center';
    progress: boolean;
  };
  VariantDefinitions: Record<string, NotifyVariant>;
}

export interface QBConfigShape {
  MaxPlayers: number;
  DefaultSpawn: XYZW;
  /** Background data save interval in MINUTES. */
  UpdateInterval: number;
  /** Hunger/thirst tick interval in MILLISECONDS. */
  StatusInterval: number;
  Money: MoneyConfig;
  Player: PlayerSubConfig;
  Server: ServerSubConfig;
  Commands: CommandsSubConfig;
  Notify: NotifySubConfig;
}

/** `GetConvarInt('sv_maxclients', 48)` — read at module load. */
function getMaxPlayers(): number {
  try {
    const value = GetConvarInt('sv_maxclients', 48);
    return typeof value === 'number' && Number.isFinite(value) ? value : 48;
  } catch {
    // Tests or non-FXServer contexts.
    return 48;
  }
}

export const QBConfig: QBConfigShape = {
  MaxPlayers: getMaxPlayers(),
  DefaultSpawn: { x: -1035.71, y: -2731.87, z: 12.86, w: 0.0 },
  UpdateInterval: 5,
  StatusInterval: 5000,

  Money: {
    MoneyTypes: { cash: 500, bank: 5000, crypto: 0 },
    DontAllowMinus: ['cash', 'crypto'],
    MinusLimit: -5000,
    PayCheckTimeOut: 10,
    PayCheckSociety: false,
  },

  Player: {
    HungerRate: 4.2,
    ThirstRate: 3.8,
    Bloodtypes: [
      'A+',
      'A-',
      'B+',
      'B-',
      'AB+',
      'AB-',
      'O+',
      'O-',
    ] as const,
  },

  Server: {
    Closed: false,
    ClosedReason: 'Server Closed',
    Uptime: 0,
    Whitelist: false,
    WhitelistPermission: 'admin',
    PVP: true,
    Discord: '',
    CheckDuplicateLicense: true,
    Permissions: ['god', 'admin', 'mod'] as const,
  },

  Commands: {
    OOCColor: [255, 151, 133] as const,
  },

  Notify: {
    NotificationStyling: {
      group: false,
      position: 'right',
      progress: true,
    },
    VariantDefinitions: {
      success: { classes: 'success', icon: 'check_circle' },
      primary: { classes: 'primary', icon: 'notifications' },
      warning: { classes: 'warning', icon: 'warning' },
      error: { classes: 'error', icon: 'error' },
      police: { classes: 'police', icon: 'local_police' },
      ambulance: { classes: 'ambulance', icon: 'fas fa-ambulance' },
    },
  },
};
