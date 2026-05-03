/// <reference types="@citizenfx/server" />

// Direct port of qb-core/server/exports.lua. Runtime mutation of
// QBCore.Shared (Add/Update/Remove for Jobs/Items/Gangs) plus
// generic SetMethod/SetField escape hatches and the
// ExploitBan / GetCoreVersion helpers.
//
// Every mutator returns the upstream `(success: boolean, message:
// string, errorItem?: unknown)` triple. Cross-language consumers
// pattern-match on the message string ('success', 'job_exists',
// 'item_not_exists', etc.) — keep the strings exact.
//
// Each registration is also re-exported as a top-level FXServer
// export so callers can do `exports['qb-core']:AddItem(name, item)`
// directly.

import type { QBCoreShape } from './qbcore';

const oxmysql = (exports as any).oxmysql;

type Result2 = [boolean, string];
type Result3 = [boolean, string, unknown?];

export function installExtraExports(QBCore: QBCoreShape): void {
  const Functions = QBCore.Functions as any;
  const Shared = QBCore.Shared as Record<string, Record<string, unknown>>;
  const exportFn = (globalThis as any).exports as (
    name: string,
    fn: unknown
  ) => void;

  // ---------- Generic extensibility ----------

  function SetMethod(
    methodName: string,
    handler: (...args: unknown[]) => unknown
  ): Result2 {
    if (typeof methodName !== 'string') return [false, 'invalid_method_name'];
    Functions[methodName] = handler;
    emit('QBCore:Server:UpdateObject');
    return [true, 'success'];
  }
  Functions.SetMethod = SetMethod;
  exportFn('SetMethod', SetMethod);

  function SetField(fieldName: string, data: unknown): Result2 {
    if (typeof fieldName !== 'string') return [false, 'invalid_field_name'];
    (QBCore as unknown as Record<string, unknown>)[fieldName] = data;
    emit('QBCore:Server:UpdateObject');
    return [true, 'success'];
  }
  Functions.SetField = SetField;
  exportFn('SetField', SetField);

  // ---------- Jobs ----------

  function AddJob(jobName: string, job: unknown): Result2 {
    if (typeof jobName !== 'string') return [false, 'invalid_job_name'];
    if (Shared.Jobs[jobName]) return [false, 'job_exists'];
    Shared.Jobs[jobName] = job as Record<string, unknown>;
    emitNet('QBCore:Client:OnSharedUpdate', -1, 'Jobs', jobName, job);
    emit('QBCore:Server:UpdateObject');
    return [true, 'success'];
  }
  Functions.AddJob = AddJob;
  exportFn('AddJob', AddJob);

  function AddJobs(jobs: Record<string, unknown>): Result3 {
    for (const [key, value] of Object.entries(jobs)) {
      if (typeof key !== 'string') return [false, 'invalid_job_name', value];
      if (Shared.Jobs[key]) return [false, 'job_exists', value];
      Shared.Jobs[key] = value as Record<string, unknown>;
    }
    emitNet('QBCore:Client:OnSharedUpdateMultiple', -1, 'Jobs', jobs);
    emit('QBCore:Server:UpdateObject');
    return [true, 'success', undefined];
  }
  Functions.AddJobs = AddJobs;
  exportFn('AddJobs', AddJobs);

  function RemoveJob(jobName: string): Result2 {
    if (typeof jobName !== 'string') return [false, 'invalid_job_name'];
    if (!Shared.Jobs[jobName]) return [false, 'job_not_exists'];
    delete Shared.Jobs[jobName];
    emitNet('QBCore:Client:OnSharedUpdate', -1, 'Jobs', jobName, null);
    emit('QBCore:Server:UpdateObject');
    return [true, 'success'];
  }
  Functions.RemoveJob = RemoveJob;
  exportFn('RemoveJob', RemoveJob);

  function UpdateJob(jobName: string, job: unknown): Result2 {
    if (typeof jobName !== 'string') return [false, 'invalid_job_name'];
    if (!Shared.Jobs[jobName]) return [false, 'job_not_exists'];
    Shared.Jobs[jobName] = job as Record<string, unknown>;
    emitNet('QBCore:Client:OnSharedUpdate', -1, 'Jobs', jobName, job);
    emit('QBCore:Server:UpdateObject');
    return [true, 'success'];
  }
  Functions.UpdateJob = UpdateJob;
  exportFn('UpdateJob', UpdateJob);

  // ---------- Items ----------

  function AddItem(itemName: string, item: unknown): Result2 {
    if (typeof itemName !== 'string') return [false, 'invalid_item_name'];
    if (Shared.Items[itemName]) return [false, 'item_exists'];
    Shared.Items[itemName] = item as Record<string, unknown>;
    emitNet('QBCore:Client:OnSharedUpdate', -1, 'Items', itemName, item);
    emit('QBCore:Server:UpdateObject');
    return [true, 'success'];
  }
  Functions.AddItem = AddItem;
  exportFn('AddItem', AddItem);

  function UpdateItem(itemName: string, item: unknown): Result2 {
    if (typeof itemName !== 'string') return [false, 'invalid_item_name'];
    if (!Shared.Items[itemName]) return [false, 'item_not_exists'];
    Shared.Items[itemName] = item as Record<string, unknown>;
    emitNet('QBCore:Client:OnSharedUpdate', -1, 'Items', itemName, item);
    emit('QBCore:Server:UpdateObject');
    return [true, 'success'];
  }
  Functions.UpdateItem = UpdateItem;
  exportFn('UpdateItem', UpdateItem);

  function AddItems(items: Record<string, unknown>): Result3 {
    for (const [key, value] of Object.entries(items)) {
      if (typeof key !== 'string') return [false, 'invalid_item_name', value];
      if (Shared.Items[key]) return [false, 'item_exists', value];
      Shared.Items[key] = value as Record<string, unknown>;
    }
    emitNet('QBCore:Client:OnSharedUpdateMultiple', -1, 'Items', items);
    emit('QBCore:Server:UpdateObject');
    return [true, 'success', undefined];
  }
  Functions.AddItems = AddItems;
  exportFn('AddItems', AddItems);

  function RemoveItem(itemName: string): Result2 {
    if (typeof itemName !== 'string') return [false, 'invalid_item_name'];
    if (!Shared.Items[itemName]) return [false, 'item_not_exists'];
    delete Shared.Items[itemName];
    emitNet('QBCore:Client:OnSharedUpdate', -1, 'Items', itemName, null);
    emit('QBCore:Server:UpdateObject');
    return [true, 'success'];
  }
  Functions.RemoveItem = RemoveItem;
  exportFn('RemoveItem', RemoveItem);

  // ---------- Gangs ----------

  function AddGang(gangName: string, gang: unknown): Result2 {
    if (typeof gangName !== 'string') return [false, 'invalid_gang_name'];
    if (Shared.Gangs[gangName]) return [false, 'gang_exists'];
    Shared.Gangs[gangName] = gang as Record<string, unknown>;
    emitNet('QBCore:Client:OnSharedUpdate', -1, 'Gangs', gangName, gang);
    emit('QBCore:Server:UpdateObject');
    return [true, 'success'];
  }
  Functions.AddGang = AddGang;
  exportFn('AddGang', AddGang);

  function AddGangs(gangs: Record<string, unknown>): Result3 {
    for (const [key, value] of Object.entries(gangs)) {
      if (typeof key !== 'string') return [false, 'invalid_gang_name', value];
      if (Shared.Gangs[key]) return [false, 'gang_exists', value];
      Shared.Gangs[key] = value as Record<string, unknown>;
    }
    emitNet('QBCore:Client:OnSharedUpdateMultiple', -1, 'Gangs', gangs);
    emit('QBCore:Server:UpdateObject');
    return [true, 'success', undefined];
  }
  Functions.AddGangs = AddGangs;
  exportFn('AddGangs', AddGangs);

  function RemoveGang(gangName: string): Result2 {
    if (typeof gangName !== 'string') return [false, 'invalid_gang_name'];
    if (!Shared.Gangs[gangName]) return [false, 'gang_not_exists'];
    delete Shared.Gangs[gangName];
    emitNet('QBCore:Client:OnSharedUpdate', -1, 'Gangs', gangName, null);
    emit('QBCore:Server:UpdateObject');
    return [true, 'success'];
  }
  Functions.RemoveGang = RemoveGang;
  exportFn('RemoveGang', RemoveGang);

  function UpdateGang(gangName: string, gang: unknown): Result2 {
    if (typeof gangName !== 'string') return [false, 'invalid_gang_name'];
    if (!Shared.Gangs[gangName]) return [false, 'gang_not_exists'];
    Shared.Gangs[gangName] = gang as Record<string, unknown>;
    emitNet('QBCore:Client:OnSharedUpdate', -1, 'Gangs', gangName, gang);
    emit('QBCore:Server:UpdateObject');
    return [true, 'success'];
  }
  Functions.UpdateGang = UpdateGang;
  exportFn('UpdateGang', UpdateGang);

  // ---------- Version + ExploitBan ----------

  const resourceName = GetCurrentResourceName();

  function GetCoreVersion(invokingResource?: string): string {
    const v = GetResourceMetadata(resourceName, 'version', 0) ?? '';
    if (invokingResource) {
      console.log(
        `${invokingResource || 'Unknown Resource'} called qbcore version check: ${v}`
      );
    }
    return v;
  }
  Functions.GetCoreVersion = GetCoreVersion;
  exportFn('GetCoreVersion', GetCoreVersion);

  function ExploitBan(playerId: number, origin: string): void {
    const name = GetPlayerName(String(playerId));
    void oxmysql.insert_async(
      'INSERT INTO bans (name, license, discord, ip, reason, expire, bannedby) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        Functions.GetIdentifier(playerId, 'license'),
        Functions.GetIdentifier(playerId, 'discord'),
        Functions.GetIdentifier(playerId, 'ip'),
        origin,
        2147483647,
        'Anti Cheat',
      ]
    );
    DropPlayer(
      String(playerId),
      `You have been banned for exploiting. Discord: ${QBCore.Config.Server.Discord}`
    );
    emit(
      'qb-log:server:CreateLog',
      'anticheat',
      'Anti-Cheat',
      'red',
      `${name} has been banned for exploiting ${origin}`,
      true
    );
  }
  exportFn('ExploitBan', ExploitBan);
}
