/// <reference types="@citizenfx/server" />

// Direct port of qb-core/server/player.lua. The Player object built
// here is the single most-touched surface in the entire framework —
// every QBCore-aware resource calls into Player.PlayerData.X or
// Player.Functions.X. Method shapes / return types must match
// upstream exactly, which is why this file mirrors the Lua source
// almost line-for-line.
//
// Key contract guarantees preserved:
//   - `Player.Functions.AddMoney(type, amount, reason)` returns
//     true on success, false on failure / negative amount / unknown
//     type / DontAllowMinus violation.
//   - `Player.Functions.RemoveMoney` honors DontAllowMinus and
//     MinusLimit per QBConfig.Money.
//   - `Player.Functions.SetJob` validates against QBCore.Shared.Jobs
//     and fires both server (`QBCore:Server:OnJobUpdate`) and
//     client (`QBCore:Client:OnJobUpdate`) events.
//   - `Player.Functions.UpdatePlayerData(key?, val?)` is the
//     mutation propagator everything routes through.
//
// JSON columns in the `players` table are JSON.stringify'd on
// save and JSON.parse'd on load, matching the upstream `json.encode`
// / `json.decode` pattern exactly.

import type { QBCoreShape } from './qbcore';
import { Lang } from '../shared/lang';

const oxmysql = (exports as any).oxmysql;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface MoneyMap {
  [moneyType: string]: number;
}

interface JobGradeData {
  name: string;
  level: number;
  payment?: number;
  isboss: boolean;
}

interface JobData {
  name: string;
  label: string;
  payment?: number;
  type?: string;
  onduty: boolean;
  isboss: boolean;
  grade: JobGradeData;
}

interface GangGradeData {
  name: string;
  level: number;
  isboss: boolean;
}

interface GangData {
  name: string;
  label: string;
  isboss: boolean;
  grade: GangGradeData;
}

interface PlayerCharInfo {
  firstname: string;
  lastname: string;
  birthdate: string;
  gender: number;
  nationality: string;
  phone: string;
  account: string;
  [key: string]: unknown;
}

interface PlayerMetadata {
  hunger: number;
  thirst: number;
  stress: number;
  isdead: boolean;
  inlaststand: boolean;
  armor: number;
  ishandcuffed: boolean;
  tracker: boolean;
  injail: number;
  jailitems: unknown[];
  status: Record<string, unknown>;
  phone: Record<string, unknown>;
  rep: Record<string, number>;
  currentapartment: unknown;
  callsign: string;
  bloodtype: string;
  fingerprint: string;
  walletid: string;
  criminalrecord: { hasRecord: boolean; date: number | null };
  licences: { driver: boolean; business: boolean; weapon: boolean };
  inside: {
    house: unknown;
    apartment: { apartmentType: unknown; apartmentId: unknown };
  };
  phonedata: { SerialNumber: string | number; InstalledApps: unknown[] };
  [key: string]: unknown;
}

export interface PlayerData {
  source: number;
  citizenid: string;
  cid: number;
  license: string;
  name: string;
  money: MoneyMap;
  optin?: boolean;
  charinfo: PlayerCharInfo;
  job: JobData;
  gang: GangData;
  metadata: PlayerMetadata;
  position: { x: number; y: number; z: number; w?: number };
  items: unknown[];
  [key: string]: unknown;
}

export interface QBPlayer {
  PlayerData: PlayerData;
  Offline: boolean;
  Functions: {
    UpdatePlayerData: (key?: string, val?: unknown) => void;
    SetJob: (job: string, grade?: string | number) => boolean;
    SetGang: (gang: string, grade?: string | number) => boolean;
    Notify: (text: string, type?: string, length?: number) => void;
    HasItem: (items: string | string[], amount?: number) => boolean;
    GetName: () => string;
    SetJobDuty: (onDuty: boolean) => void;
    SetPlayerData: (key: string, val: unknown) => void;
    SetMetaData: (meta: string, val: unknown) => void;
    GetMetaData: (meta: string) => unknown;
    AddRep: (rep: string, amount: number) => void;
    RemoveRep: (rep: string, amount: number) => void;
    GetRep: (rep: string) => number;
    AddMoney: (moneytype: string, amount: number, reason?: string) => boolean;
    RemoveMoney: (
      moneytype: string,
      amount: number,
      reason?: string
    ) => boolean;
    SetMoney: (moneytype: string, amount: number, reason?: string) => boolean;
    GetMoney: (moneytype: string) => number | false;
    Save: () => void;
    Logout: () => void;
    AddMethod: (name: string, handler: (...args: unknown[]) => unknown) => void;
    AddField: (name: string, data: unknown) => void;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const RESOURCE_NAME = GetCurrentResourceName();

function showError(msg: string): void {
  console.log(`^1[${RESOURCE_NAME}]^7 ${msg}`);
}

function showSuccess(msg: string): void {
  console.log(`^2[${RESOURCE_NAME}]^7 ${msg}`);
}

/** Recursively merge defaults into playerData. Lua functions in the
 *  defaults are invoked at apply time (lazy initialization for
 *  citizenid / phone / account / fingerprint / walletid / serial /
 *  bloodtype). */
async function applyDefaults(target: any, defaults: any): Promise<void> {
  for (const key of Object.keys(defaults)) {
    const def = defaults[key];
    if (typeof def === 'function') {
      if (target[key] === undefined || target[key] === null) {
        // The factories that need DB uniqueness checks (CreateCitizenId,
        // CreateFingerId, CreateWalletId, CreateSerialNumber, plus the
        // qb-core/player.ts variants of CreatePhoneNumber and
        // CreateAccountNumber) are async — they return Promises. Without
        // `await` here the Promise object lands in PlayerData, then
        // JSON.stringify produces `{}` for it, and the row inserts with
        // empty-object citizenid/phone/account/fingerprint/walletid/etc.
        // Symptom: SQL syntax error from oxmysql and a corrupt row even
        // when the SQL parses, since downstream resources expect strings.
        target[key] = await def();
      }
    } else if (
      def !== null &&
      typeof def === 'object' &&
      !Array.isArray(def)
    ) {
      target[key] = target[key] ?? {};
      await applyDefaults(target[key], def);
    } else {
      target[key] = target[key] ?? def;
    }
  }
}

/** Build the PlayerDefaults object with lazy initializers wired up.
 *  Mirrors `QBConfig.Player.PlayerDefaults` in upstream config.lua —
 *  but lives here because the lazy fields reference QBCore methods
 *  that don't exist at config-load time. */
function getPlayerDefaults(QBCore: QBCoreShape): Record<string, unknown> {
  const Player = QBCore.Player as any;
  const Functions = QBCore.Functions as any;
  const moneyTypes = QBCore.Config.Money.MoneyTypes;
  return {
    citizenid: () => Player.CreateCitizenId(),
    cid: 1,
    money: () => ({ ...moneyTypes }),
    optin: true,
    charinfo: {
      firstname: 'Firstname',
      lastname: 'Lastname',
      birthdate: '00-00-0000',
      gender: 0,
      nationality: 'USA',
      phone: () => Functions.CreatePhoneNumber(),
      account: () => Functions.CreateAccountNumber(),
    },
    job: {
      name: 'unemployed',
      label: 'Civilian',
      payment: 10,
      type: 'none',
      onduty: false,
      isboss: false,
      grade: { name: 'Freelancer', level: 0 },
    },
    gang: {
      name: 'none',
      label: 'No Gang Affiliation',
      isboss: false,
      grade: { name: 'none', level: 0 },
    },
    metadata: {
      hunger: 100,
      thirst: 100,
      stress: 0,
      isdead: false,
      inlaststand: false,
      armor: 0,
      ishandcuffed: false,
      tracker: false,
      injail: 0,
      jailitems: [],
      status: {},
      phone: {},
      rep: {},
      currentapartment: null,
      callsign: 'NO CALLSIGN',
      bloodtype: () => {
        const types = QBCore.Config.Player.Bloodtypes;
        return types[Math.floor(Math.random() * types.length)];
      },
      fingerprint: () => Player.CreateFingerId(),
      walletid: () => Player.CreateWalletId(),
      criminalrecord: { hasRecord: false, date: null },
      licences: { driver: true, business: false, weapon: false },
      inside: {
        house: null,
        apartment: { apartmentType: null, apartmentId: null },
      },
      phonedata: {
        SerialNumber: () => Player.CreateSerialNumber(),
        InstalledApps: [],
      },
    },
    position: QBCore.Config.DefaultSpawn,
    items: [],
  };
}

/** JSON columns the `players` table stores as text. Decoded on load,
 *  encoded on save. */
const JSON_COLS = ['money', 'job', 'gang', 'position', 'metadata', 'charinfo'];

function decodeJsonColumns(row: any): any {
  for (const col of JSON_COLS) {
    if (typeof row[col] === 'string') {
      try {
        row[col] = JSON.parse(row[col]);
      } catch {
        // leave as-is — corrupt JSON is logged elsewhere when read
      }
    }
  }
  return row;
}

export function installPlayer(QBCore: QBCoreShape): void {
  const Players = QBCore.Players as Record<number, QBPlayer>;
  const Player = QBCore.Player as any;
  const Functions = QBCore.Functions as any;

  // ---------- Lifecycle ----------

  Player.Login = async (
    source: number | string,
    citizenid?: string,
    newData?: Partial<PlayerData>
  ): Promise<boolean> => {
    if (!source && source !== 0) {
      showError('ERROR QBCORE.PLAYER.LOGIN - NO SOURCE GIVEN!');
      return false;
    }
    const src = Number(source);
    if (citizenid) {
      const license = Functions.GetIdentifier(src, 'license');
      const row = await oxmysql.prepare_async(
        'SELECT * FROM players where citizenid = ?',
        [citizenid]
      );
      if (row && license === row.license) {
        decodeJsonColumns(row);
        await Player.CheckPlayerData(src, row);
      } else {
        DropPlayer(String(src), Lang.t('info.exploit_dropped'));
        emit(
          'qb-log:server:CreateLog',
          'anticheat',
          'Anti-Cheat',
          'white',
          `${GetPlayerName(String(src))} Has Been Dropped For Character Joining Exploit`,
          false
        );
        return false;
      }
    } else {
      await Player.CheckPlayerData(src, newData ?? {});
    }
    return true;
  };

  Player.GetOfflinePlayer = async (
    citizenid: string
  ): Promise<QBPlayer | null> => {
    if (!citizenid) return null;
    const row = await oxmysql.prepare_async(
      'SELECT * FROM players where citizenid = ?',
      [citizenid]
    );
    if (!row) return null;
    decodeJsonColumns(row);
    return Player.CheckPlayerData(null, row);
  };

  Player.GetPlayerByLicense = async (
    license: string
  ): Promise<QBPlayer | null> => {
    if (!license) return null;
    const src = Functions.GetSource(license);
    if (src > 0) return Players[src] ?? null;
    return Player.GetOfflinePlayerByLicense(license);
  };

  Player.GetOfflinePlayerByLicense = async (
    license: string
  ): Promise<QBPlayer | null> => {
    if (!license) return null;
    const row = await oxmysql.prepare_async(
      'SELECT * FROM players where license = ?',
      [license]
    );
    if (!row) return null;
    decodeJsonColumns(row);
    return Player.CheckPlayerData(null, row);
  };

  Player.CheckPlayerData = async (
    source: number | null,
    playerData: any
  ): Promise<QBPlayer> => {
    playerData = playerData || {};
    const offline = source === null;

    if (source !== null) {
      playerData.source = source;
      playerData.license =
        playerData.license ?? Functions.GetIdentifier(source, 'license');
      playerData.name = GetPlayerName(String(source));
    }

    // Validate job, fall through to defaults if invalid.
    let validatedJob = false;
    if (
      playerData.job?.name &&
      playerData.job?.grade?.level !== undefined &&
      playerData.job.grade.level !== null
    ) {
      const jobInfo = QBCore.Shared.Jobs[playerData.job.name];
      if (jobInfo) {
        const gradeKey = String(playerData.job.grade.level);
        const gradeInfo = jobInfo.grades[gradeKey];
        if (gradeInfo) {
          playerData.job.label = jobInfo.label;
          playerData.job.grade.name = gradeInfo.name;
          playerData.job.payment = gradeInfo.payment;
          playerData.job.grade.isboss = !!gradeInfo.isboss;
          playerData.job.isboss = !!gradeInfo.isboss;
          validatedJob = true;
        }
      }
    }
    if (!validatedJob) {
      playerData.job = null;
    }

    let validatedGang = false;
    if (
      playerData.gang?.name &&
      playerData.gang?.grade?.level !== undefined &&
      playerData.gang.grade.level !== null
    ) {
      const gangInfo = QBCore.Shared.Gangs[playerData.gang.name];
      if (gangInfo) {
        const gradeKey = String(playerData.gang.grade.level);
        const gradeInfo = gangInfo.grades[gradeKey];
        if (gradeInfo) {
          playerData.gang.label = gangInfo.label;
          playerData.gang.grade.name = gradeInfo.name;
          playerData.gang.grade.isboss = !!gradeInfo.isboss;
          playerData.gang.isboss = !!gradeInfo.isboss;
          validatedGang = true;
        }
      }
    }
    if (!validatedGang) {
      playerData.gang = null;
    }

    await applyDefaults(playerData, getPlayerDefaults(QBCore));

    if (playerData.job && QBCore.Shared.ForceJobDefaultDutyAtLogin) {
      const jobInfo = QBCore.Shared.Jobs[playerData.job.name];
      if (jobInfo) playerData.job.onduty = jobInfo.defaultDuty;
    }

    if (GetResourceState('qb-inventory') !== 'missing') {
      try {
        playerData.items =
          (exports as any)['qb-inventory'].LoadInventory(
            playerData.source,
            playerData.citizenid
          ) ?? [];
      } catch {
        playerData.items = playerData.items ?? [];
      }
    }

    return Player.CreatePlayer(playerData, offline);
  };

  Player.Logout = async (source: number): Promise<void> => {
    emitNet('QBCore:Client:OnPlayerUnload', source);
    emit('QBCore:Server:OnPlayerUnload', source);
    emitNet('QBCore:Player:UpdatePlayerData', source);
    await sleep(200);
    delete Players[source];
  };

  // ---------- Player object factory ----------

  Player.CreatePlayer = (
    playerData: PlayerData,
    offline: boolean
  ): QBPlayer => {
    // Build the QBPlayer instance. Methods close over `self` so the
    // Lua-side `self.X` accesses translate to JS closure references.
    const self: QBPlayer = {
      PlayerData: playerData,
      Offline: offline,
      Functions: {} as QBPlayer['Functions'],
    };

    self.Functions.UpdatePlayerData = (key?: string, val?: unknown): void => {
      if (self.Offline) return;
      emit('QBCore:Player:SetPlayerData', self.PlayerData);
      if (key && val !== undefined) {
        emitNet(
          'QBCore:Player:UpdatePlayerDataField',
          self.PlayerData.source,
          key,
          val
        );
      } else {
        emitNet(
          'QBCore:Player:SetPlayerData',
          self.PlayerData.source,
          self.PlayerData
        );
      }
    };

    self.Functions.SetJob = (job: string, grade?: string | number): boolean => {
      const jobName = String(job).toLowerCase();
      const gradeKey = String(grade ?? '0');
      const jobInfo = QBCore.Shared.Jobs[jobName];
      if (!jobInfo) return false;
      self.PlayerData.job = {
        name: jobName,
        label: jobInfo.label,
        onduty: jobInfo.defaultDuty,
        type: jobInfo.type ?? 'none',
        isboss: false,
        grade: {
          name: 'No Grades',
          level: 0,
          payment: 30,
          isboss: false,
        },
      };
      const gradeInfo = jobInfo.grades[gradeKey];
      if (gradeInfo) {
        self.PlayerData.job.grade.name = gradeInfo.name;
        self.PlayerData.job.grade.level = Number(gradeKey);
        self.PlayerData.job.grade.payment = gradeInfo.payment;
        self.PlayerData.job.grade.isboss = !!gradeInfo.isboss;
        self.PlayerData.job.isboss = !!gradeInfo.isboss;
      }
      if (!self.Offline) {
        self.Functions.UpdatePlayerData('job', self.PlayerData.job);
        emit(
          'QBCore:Server:OnJobUpdate',
          self.PlayerData.source,
          self.PlayerData.job
        );
        emitNet(
          'QBCore:Client:OnJobUpdate',
          self.PlayerData.source,
          self.PlayerData.job
        );
      }
      return true;
    };

    self.Functions.SetGang = (gang: string, grade?: string | number): boolean => {
      const gangName = String(gang).toLowerCase();
      const gradeKey = String(grade ?? '0');
      const gangInfo = QBCore.Shared.Gangs[gangName];
      if (!gangInfo) return false;
      self.PlayerData.gang = {
        name: gangName,
        label: gangInfo.label,
        isboss: false,
        grade: { name: 'No Grades', level: 0, isboss: false },
      };
      const gradeInfo = gangInfo.grades[gradeKey];
      if (gradeInfo) {
        self.PlayerData.gang.grade.name = gradeInfo.name;
        self.PlayerData.gang.grade.level = Number(gradeKey);
        self.PlayerData.gang.grade.isboss = !!gradeInfo.isboss;
        self.PlayerData.gang.isboss = !!gradeInfo.isboss;
      }
      if (!self.Offline) {
        self.Functions.UpdatePlayerData('gang', self.PlayerData.gang);
        emit(
          'QBCore:Server:OnGangUpdate',
          self.PlayerData.source,
          self.PlayerData.gang
        );
        emitNet(
          'QBCore:Client:OnGangUpdate',
          self.PlayerData.source,
          self.PlayerData.gang
        );
      }
      return true;
    };

    self.Functions.Notify = (text: string, type?: string, length?: number): void => {
      emitNet('QBCore:Notify', self.PlayerData.source, text, type, length);
    };

    self.Functions.HasItem = (
      items: string | string[],
      amount?: number
    ): boolean => Functions.HasItem(self.PlayerData.source, items, amount);

    self.Functions.GetName = (): string => {
      const ci = self.PlayerData.charinfo;
      return `${ci.firstname} ${ci.lastname}`;
    };

    self.Functions.SetJobDuty = (onDuty: boolean): void => {
      self.PlayerData.job.onduty = !!onDuty;
      emit(
        'QBCore:Server:OnJobUpdate',
        self.PlayerData.source,
        self.PlayerData.job
      );
      emitNet(
        'QBCore:Client:OnJobUpdate',
        self.PlayerData.source,
        self.PlayerData.job
      );
      self.Functions.UpdatePlayerData('job', self.PlayerData.job);
    };

    self.Functions.SetPlayerData = (key: string, val: unknown): void => {
      if (!key || typeof key !== 'string') return;
      (self.PlayerData as any)[key] = val;
      self.Functions.UpdatePlayerData(key, val);
    };

    self.Functions.SetMetaData = (meta: string, val: unknown): void => {
      if (!meta || typeof meta !== 'string') return;
      let v = val;
      if (meta === 'hunger' || meta === 'thirst') {
        const n = Number(val);
        v = n > 100 ? 100 : n;
      }
      (self.PlayerData.metadata as any)[meta] = v;
      self.Functions.UpdatePlayerData('metadata', self.PlayerData.metadata);
    };

    self.Functions.GetMetaData = (meta: string): unknown => {
      if (!meta || typeof meta !== 'string') return undefined;
      return (self.PlayerData.metadata as any)[meta];
    };

    self.Functions.AddRep = (rep: string, amount: number): void => {
      if (!rep || amount === undefined) return;
      const add = Number(amount);
      const cur = self.PlayerData.metadata.rep[rep] ?? 0;
      self.PlayerData.metadata.rep[rep] = cur + add;
      self.Functions.UpdatePlayerData('metadata', self.PlayerData.metadata);
    };

    self.Functions.RemoveRep = (rep: string, amount: number): void => {
      if (!rep || amount === undefined) return;
      const sub = Number(amount);
      const cur = self.PlayerData.metadata.rep[rep] ?? 0;
      self.PlayerData.metadata.rep[rep] = cur - sub < 0 ? 0 : cur - sub;
      self.Functions.UpdatePlayerData('metadata', self.PlayerData.metadata);
    };

    self.Functions.GetRep = (rep: string): number => {
      if (!rep) return 0;
      return self.PlayerData.metadata.rep[rep] ?? 0;
    };

    self.Functions.AddMoney = (
      moneytype: string,
      amount: number,
      reason?: string
    ): boolean => {
      const r = reason ?? 'unknown';
      const t = String(moneytype).toLowerCase();
      const a = Number(amount);
      if (a < 0) return false;
      if (self.PlayerData.money[t] === undefined) return false;
      self.PlayerData.money[t] = self.PlayerData.money[t] + a;
      if (!self.Offline) {
        self.Functions.UpdatePlayerData('money', self.PlayerData.money);
        const tag =
          `**${GetPlayerName(String(self.PlayerData.source))}` +
          ` (citizenid: ${self.PlayerData.citizenid} | id: ${self.PlayerData.source})** ` +
          `$${a} (${t}) added, new ${t} balance: ${self.PlayerData.money[t]} reason: ${r}`;
        emit(
          'qb-log:server:CreateLog',
          'playermoney',
          'AddMoney',
          'lightgreen',
          tag,
          a > 100000
        );
        emitNet(
          'hud:client:OnMoneyChange',
          self.PlayerData.source,
          t,
          a,
          false
        );
        emitNet(
          'QBCore:Client:OnMoneyChange',
          self.PlayerData.source,
          t,
          a,
          'add',
          r
        );
        emit(
          'QBCore:Server:OnMoneyChange',
          self.PlayerData.source,
          t,
          a,
          'add',
          r
        );
      }
      return true;
    };

    self.Functions.RemoveMoney = (
      moneytype: string,
      amount: number,
      reason?: string
    ): boolean => {
      const r = reason ?? 'unknown';
      const t = String(moneytype).toLowerCase();
      const a = Number(amount);
      if (a < 0) return false;
      if (self.PlayerData.money[t] === undefined) return false;
      for (const blocked of QBCore.Config.Money.DontAllowMinus) {
        if (blocked === t) {
          if (self.PlayerData.money[t] - a < 0) return false;
        }
      }
      if (self.PlayerData.money[t] - a < QBCore.Config.Money.MinusLimit) {
        return false;
      }
      self.PlayerData.money[t] = self.PlayerData.money[t] - a;
      if (!self.Offline) {
        self.Functions.UpdatePlayerData('money', self.PlayerData.money);
        const tag =
          `**${GetPlayerName(String(self.PlayerData.source))}` +
          ` (citizenid: ${self.PlayerData.citizenid} | id: ${self.PlayerData.source})** ` +
          `$${a} (${t}) removed, new ${t} balance: ${self.PlayerData.money[t]} reason: ${r}`;
        emit(
          'qb-log:server:CreateLog',
          'playermoney',
          'RemoveMoney',
          'red',
          tag,
          a > 100000
        );
        emitNet(
          'hud:client:OnMoneyChange',
          self.PlayerData.source,
          t,
          a,
          true
        );
        if (t === 'bank') {
          emitNet(
            'qb-phone:client:RemoveBankMoney',
            self.PlayerData.source,
            a
          );
        }
        emitNet(
          'QBCore:Client:OnMoneyChange',
          self.PlayerData.source,
          t,
          a,
          'remove',
          r
        );
        emit(
          'QBCore:Server:OnMoneyChange',
          self.PlayerData.source,
          t,
          a,
          'remove',
          r
        );
      }
      return true;
    };

    self.Functions.SetMoney = (
      moneytype: string,
      amount: number,
      reason?: string
    ): boolean => {
      const r = reason ?? 'unknown';
      const t = String(moneytype).toLowerCase();
      const a = Number(amount);
      if (a < 0) return false;
      if (self.PlayerData.money[t] === undefined) return false;
      const diff = a - self.PlayerData.money[t];
      self.PlayerData.money[t] = a;
      if (!self.Offline) {
        self.Functions.UpdatePlayerData('money', self.PlayerData.money);
        emit(
          'qb-log:server:CreateLog',
          'playermoney',
          'SetMoney',
          'green',
          `**${GetPlayerName(String(self.PlayerData.source))} (citizenid: ${
            self.PlayerData.citizenid
          } | id: ${self.PlayerData.source})** $${a} (${t}) set, new ${t} balance: ${
            self.PlayerData.money[t]
          } reason: ${r}`
        );
        emitNet(
          'hud:client:OnMoneyChange',
          self.PlayerData.source,
          t,
          Math.abs(diff),
          diff < 0
        );
        emitNet(
          'QBCore:Client:OnMoneyChange',
          self.PlayerData.source,
          t,
          a,
          'set',
          r
        );
        emit(
          'QBCore:Server:OnMoneyChange',
          self.PlayerData.source,
          t,
          a,
          'set',
          r
        );
      }
      return true;
    };

    self.Functions.GetMoney = (moneytype: string): number | false => {
      if (!moneytype) return false;
      return self.PlayerData.money[moneytype.toLowerCase()] ?? false;
    };

    self.Functions.Save = (): void => {
      if (self.Offline) {
        Player.SaveOffline(self.PlayerData);
      } else {
        Player.Save(self.PlayerData.source);
      }
    };

    self.Functions.Logout = (): void => {
      if (self.Offline) return;
      Player.Logout(self.PlayerData.source);
    };

    self.Functions.AddMethod = (
      methodName: string,
      handler: (...args: unknown[]) => unknown
    ): void => {
      (self.Functions as any)[methodName] = handler;
    };

    self.Functions.AddField = (fieldName: string, data: unknown): void => {
      (self as any)[fieldName] = data;
    };

    if (self.Offline) {
      return self;
    }

    Players[self.PlayerData.source] = self;
    Player.Save(self.PlayerData.source);
    emit('QBCore:Server:PlayerLoaded', self);
    self.Functions.UpdatePlayerData();
    return self;
  };

  // ---------- Save / DB ----------

  Player.Save = async (source: number): Promise<void> => {
    const ped = GetPlayerPed(String(source));
    const coords = GetEntityCoords(ped) as unknown as { x: number; y: number; z: number };
    const p = Players[source];
    if (!p) {
      showError('ERROR QBCORE.PLAYER.SAVE - PLAYERDATA IS EMPTY!');
      return;
    }
    const pd = p.PlayerData;
    await oxmysql.insert_async(
      'INSERT INTO players (citizenid, cid, license, name, money, charinfo, job, gang, position, metadata) VALUES (:citizenid, :cid, :license, :name, :money, :charinfo, :job, :gang, :position, :metadata) ON DUPLICATE KEY UPDATE cid = :cid, name = :name, money = :money, charinfo = :charinfo, job = :job, gang = :gang, position = :position, metadata = :metadata',
      {
        citizenid: pd.citizenid,
        cid: Number(pd.cid),
        license: pd.license,
        name: pd.name,
        money: JSON.stringify(pd.money),
        charinfo: JSON.stringify(pd.charinfo),
        job: JSON.stringify(pd.job),
        gang: JSON.stringify(pd.gang),
        position: JSON.stringify(coords),
        metadata: JSON.stringify(pd.metadata),
      }
    );
    if (GetResourceState('qb-inventory') !== 'missing') {
      try {
        (exports as any)['qb-inventory'].SaveInventory(source);
      } catch {
        /* noop */
      }
    }
    showSuccess(`${pd.name} PLAYER SAVED!`);
  };

  Player.SaveOffline = async (pd: PlayerData): Promise<void> => {
    if (!pd) {
      showError('ERROR QBCORE.PLAYER.SAVEOFFLINE - PLAYERDATA IS EMPTY!');
      return;
    }
    await oxmysql.insert_async(
      'INSERT INTO players (citizenid, cid, license, name, money, charinfo, job, gang, position, metadata) VALUES (:citizenid, :cid, :license, :name, :money, :charinfo, :job, :gang, :position, :metadata) ON DUPLICATE KEY UPDATE cid = :cid, name = :name, money = :money, charinfo = :charinfo, job = :job, gang = :gang, position = :position, metadata = :metadata',
      {
        citizenid: pd.citizenid,
        cid: Number(pd.cid),
        license: pd.license,
        name: pd.name,
        money: JSON.stringify(pd.money),
        charinfo: JSON.stringify(pd.charinfo),
        job: JSON.stringify(pd.job),
        gang: JSON.stringify(pd.gang),
        position: JSON.stringify(pd.position),
        metadata: JSON.stringify(pd.metadata),
      }
    );
    if (GetResourceState('qb-inventory') !== 'missing') {
      try {
        (exports as any)['qb-inventory'].SaveInventory(pd, true);
      } catch {
        /* noop */
      }
    }
    showSuccess(`${pd.name} OFFLINE PLAYER SAVED!`);
  };

  // Inventory shortcuts (deprecated upstream — kept for compat).

  Player.SaveInventory = (source: number): void => {
    if (GetResourceState('qb-inventory') === 'missing') return;
    (exports as any)['qb-inventory'].SaveInventory(source, false);
  };

  Player.SaveOfflineInventory = (pd: PlayerData): void => {
    if (GetResourceState('qb-inventory') === 'missing') return;
    (exports as any)['qb-inventory'].SaveInventory(pd, true);
  };

  Player.GetTotalWeight = (items: unknown[]): number | undefined => {
    if (GetResourceState('qb-inventory') === 'missing') return undefined;
    return (exports as any)['qb-inventory'].GetTotalWeight(items);
  };

  Player.GetSlotsByItem = (
    items: unknown[],
    itemName: string
  ): unknown => {
    if (GetResourceState('qb-inventory') === 'missing') return undefined;
    return (exports as any)['qb-inventory'].GetSlotsByItem(items, itemName);
  };

  Player.GetFirstSlotByItem = (
    items: unknown[],
    itemName: string
  ): unknown => {
    if (GetResourceState('qb-inventory') === 'missing') return undefined;
    return (exports as any)['qb-inventory'].GetFirstSlotByItem(items, itemName);
  };

  // ---------- Delete character ----------

  const playerTables: { table: string }[] = [
    { table: 'players' },
    { table: 'apartments' },
    { table: 'bank_accounts' },
    { table: 'crypto_transactions' },
    { table: 'phone_invoices' },
    { table: 'phone_messages' },
    { table: 'playerskins' },
    { table: 'player_contacts' },
    { table: 'player_houses' },
    { table: 'player_mails' },
    { table: 'player_outfits' },
    { table: 'player_vehicles' },
  ];

  Player.DeleteCharacter = async (
    source: number,
    citizenid: string
  ): Promise<void> => {
    const license = Functions.GetIdentifier(source, 'license');
    const result = await oxmysql.scalar_async(
      'SELECT license FROM players where citizenid = ?',
      [citizenid]
    );
    if (license === result) {
      const queries = playerTables.map((t) => ({
        query: `DELETE FROM ${t.table} WHERE citizenid = ?`,
        values: [citizenid],
      }));
      await oxmysql.transaction_async(queries);
      emit(
        'qb-log:server:CreateLog',
        'joinleave',
        'Character Deleted',
        'red',
        `**${GetPlayerName(String(source))}** ${license} deleted **${citizenid}**..`
      );
    } else {
      DropPlayer(String(source), Lang.t('info.exploit_dropped'));
      emit(
        'qb-log:server:CreateLog',
        'anticheat',
        'Anti-Cheat',
        'white',
        `${GetPlayerName(String(source))} Has Been Dropped For Character Deletion Exploit`,
        true
      );
    }
  };

  Player.ForceDeleteCharacter = async (citizenid: string): Promise<void> => {
    const result = await oxmysql.scalar_async(
      'SELECT license FROM players where citizenid = ?',
      [citizenid]
    );
    if (!result) return;
    const Player2 = Functions.GetPlayerByCitizenId(citizenid) as
      | QBPlayer
      | undefined;
    if (Player2) {
      DropPlayer(
        String(Player2.PlayerData.source),
        'An admin deleted the character which you are currently using'
      );
    }
    const queries = playerTables.map((t) => ({
      query: `DELETE FROM ${t.table} WHERE citizenid = ?`,
      values: [citizenid],
    }));
    await oxmysql.transaction_async(queries);
    emit(
      'qb-log:server:CreateLog',
      'joinleave',
      'Character Force Deleted',
      'red',
      `Character **${citizenid}** got deleted`
    );
  };

  // ---------- Unique-id generators ----------

  Player.CreateCitizenId = async (): Promise<string> => {
    while (true) {
      const id = (
        QBCore.Shared.RandomStr(3) + QBCore.Shared.RandomInt(5)
      ).toUpperCase();
      const exists = await oxmysql.prepare_async(
        'SELECT EXISTS(SELECT 1 FROM players WHERE citizenid = ?) AS uniqueCheck',
        [id]
      );
      if (exists === 0 || exists === false) return id;
    }
  };

  // CreateAccountNumber and CreatePhoneNumber are also exposed under
  // QBCore.Functions in upstream — override the simple implementations
  // from Phase 2b's functions.ts with the DB-checked versions.

  Functions.CreateAccountNumber = async (): Promise<string> => {
    while (true) {
      const acct =
        'US0' +
        (Math.floor(Math.random() * 9) + 1) +
        'QBCore' +
        (Math.floor(Math.random() * 8889) + 1111).toString() +
        (Math.floor(Math.random() * 8889) + 1111).toString() +
        (Math.floor(Math.random() * 89) + 11).toString();
      const exists = await oxmysql.prepare_async(
        'SELECT EXISTS(SELECT 1 FROM players WHERE JSON_UNQUOTE(JSON_EXTRACT(charinfo, "$.account")) = ?) AS uniqueCheck',
        [acct]
      );
      if (exists === 0 || exists === false) return acct;
    }
  };

  Functions.CreatePhoneNumber = async (): Promise<string> => {
    while (true) {
      const phone =
        (Math.floor(Math.random() * 900) + 100).toString() +
        (Math.floor(Math.random() * 9000000) + 1000000).toString();
      const exists = await oxmysql.prepare_async(
        'SELECT EXISTS(SELECT 1 FROM players WHERE JSON_UNQUOTE(JSON_EXTRACT(charinfo, "$.phone")) = ?) AS uniqueCheck',
        [phone]
      );
      if (exists === 0 || exists === false) return phone;
    }
  };

  Player.CreateFingerId = async (): Promise<string> => {
    while (true) {
      const id =
        QBCore.Shared.RandomStr(2) +
        QBCore.Shared.RandomInt(3) +
        QBCore.Shared.RandomStr(1) +
        QBCore.Shared.RandomInt(2) +
        QBCore.Shared.RandomStr(3) +
        QBCore.Shared.RandomInt(4);
      const exists = await oxmysql.prepare_async(
        'SELECT EXISTS(SELECT 1 FROM players WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, "$.fingerprint")) = ?) AS uniqueCheck',
        [id]
      );
      if (exists === 0 || exists === false) return id;
    }
  };

  Player.CreateWalletId = async (): Promise<string> => {
    while (true) {
      const id = `QB-${
        Math.floor(Math.random() * 88888888) + 11111111
      }`;
      const exists = await oxmysql.prepare_async(
        'SELECT EXISTS(SELECT 1 FROM players WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, "$.walletid")) = ?) AS uniqueCheck',
        [id]
      );
      if (exists === 0 || exists === false) return id;
    }
  };

  Player.CreateSerialNumber = async (): Promise<number> => {
    while (true) {
      const id = Math.floor(Math.random() * 88888888) + 11111111;
      const exists = await oxmysql.prepare_async(
        'SELECT EXISTS(SELECT 1 FROM players WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, "$.phonedata.SerialNumber")) = ?) AS uniqueCheck',
        [id]
      );
      if (exists === 0 || exists === false) return id;
    }
  };

  // ---------- AddPlayerMethod / AddPlayerField (in QBCore.Functions
  //   per upstream, but defined here because they touch the Player
  //   object and need the same module). ----------

  Functions.AddPlayerMethod = (
    ids: number | number[],
    methodName: string,
    handler: (...args: unknown[]) => unknown
  ): void => {
    if (typeof ids === 'number') {
      if (ids === -1) {
        for (const p of Object.values(Players)) {
          p.Functions.AddMethod(methodName, handler);
        }
      } else {
        if (!Players[ids]) return;
        Players[ids].Functions.AddMethod(methodName, handler);
      }
    } else if (Array.isArray(ids)) {
      for (const id of ids) {
        Functions.AddPlayerMethod(id, methodName, handler);
      }
    }
  };

  Functions.AddPlayerField = (
    ids: number | number[],
    fieldName: string,
    data: unknown
  ): void => {
    if (typeof ids === 'number') {
      if (ids === -1) {
        for (const p of Object.values(Players)) {
          p.Functions.AddField(fieldName, data);
        }
      } else {
        if (!Players[ids]) return;
        Players[ids].Functions.AddField(fieldName, data);
      }
    } else if (Array.isArray(ids)) {
      for (const id of ids) {
        Functions.AddPlayerField(id, fieldName, data);
      }
    }
  };
}
