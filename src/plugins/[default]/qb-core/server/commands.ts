/// <reference types="@citizenfx/server" />

// Direct port of qb-core/server/commands.lua. The Add/Refresh API is
// the public surface — every downstream qb-* resource calls
// `QBCore.Commands.Add(...)` to register its admin commands at module
// load. Until this was ported, qb-core threw `NOT_YET` on every such
// call, breaking ~25 resources (qb-adminmenu, qb-banking, qb-policejob,
// qb-multicharacter, ...). Some of those throws were fatal — they
// happened at the top level of the resource's server script and
// aborted the whole resource load.
//
// Ports the full upstream surface:
//   - QBCore.Commands.Add / Refresh / List / IgnoreList
//   - The bootstrap pass that runs `add_ace qbcore.<perm> <perm>
//     allow` for each permission tier in Config.Server.Permissions
//   - The ~20 built-in admin commands (tp, tpm, togglepvp,
//     add/removepermission, open/closeserver, car, dv*, give/setmoney,
//     job/setjob, gang/setgang, ooc, me).
//
// Behavior contract preserved exactly: argsrequired triggers a
// `chat:addMessage` error before the callback runs; ACE registration
// uses `add_ace qbcore.<perm> command.<name> allow` only for perms
// that aren't in IgnoreList; multi-perm support via the trailing
// vararg works the same way (each extra perm gets its own ACE).

import type { QBCoreShape } from './qbcore';
import type { QBPlayer } from './player';
import { Lang } from '../shared/lang';

interface CommandEntry {
  name: string;
  permission: string | string[];
  help: string;
  arguments: Array<{ name: string; help: string }>;
  argsrequired: boolean;
  callback: (source: number, args: string[], rawCommand?: string) => void;
}

export function installCommands(QBCore: QBCoreShape): void {
  const Functions = QBCore.Functions as Record<string, any>;
  const Players = QBCore.Players as Record<number, QBPlayer>;

  const List: Record<string, CommandEntry> = {};
  const IgnoreList: Record<string, boolean> = {
    god: true,
    user: true,
  };

  // Add ACEs for the configured permission tiers so that `qbcore.<perm>`
  // principals can run any command that requires `<perm>`. Upstream
  // does this in a `CreateThread` — we run it synchronously since the
  // call is already async-safe (ExecuteCommand is fire-and-forget).
  for (const permission of QBCore.Config.Server.Permissions) {
    ExecuteCommand(`add_ace qbcore.${permission} ${permission} allow`);
  }

  function Add(
    name: string,
    help: string,
    args: Array<{ name: string; help: string }>,
    argsrequired: boolean,
    callback: (source: number, args: string[], rawCommand?: string) => void,
    permission?: string | string[],
    ...extraPerms: string[]
  ): void {
    let perm: string | string[] = permission ?? 'user';
    const restricted = perm !== 'user';

    RegisterCommand(
      name,
      ((source: number, cmdArgs: string[], rawCommand: string) => {
        if (argsrequired && cmdArgs.length < args.length) {
          emitNet('chat:addMessage', source, {
            color: [255, 0, 0],
            multiline: true,
            args: ['System', Lang.t('error.missing_args2')],
          });
          return;
        }
        callback(source, cmdArgs, rawCommand);
      }) as any,
      restricted
    );

    // Multi-perm: register one ACE per extra perm. The single-perm
    // path is the common case — combine into the same loop after
    // normalizing to an array.
    let permList: string[];
    if (extraPerms.length > 0) {
      permList = [...extraPerms, typeof perm === 'string' ? perm : perm[0]];
      perm = permList;
    } else if (Array.isArray(perm)) {
      permList = perm.map((p) => p.toLowerCase());
      perm = permList;
    } else {
      permList = [perm.toLowerCase()];
      perm = permList[0];
    }

    for (const p of permList) {
      const pl = p.toLowerCase();
      if (!IgnoreList[pl]) {
        ExecuteCommand(
          `add_ace qbcore.${pl} command.${name.toLowerCase()} allow`
        );
      }
    }

    List[name.toLowerCase()] = {
      name: name.toLowerCase(),
      permission: perm,
      help,
      arguments: args,
      argsrequired,
      callback,
    };
  }

  function Refresh(source: number): void {
    const player = Functions.GetPlayer(source) as QBPlayer | undefined;
    if (!player) return;
    const suggestions: Array<{
      name: string;
      help: string;
      params: typeof CommandEntry.prototype.arguments;
    }> = [];
    for (const command of Object.keys(List)) {
      const info = List[command];
      const hasPerm = IsPlayerAceAllowed(
        String(source),
        `command.${command}`
      );
      if (hasPerm) {
        suggestions.push({
          name: `/${command}`,
          help: info.help,
          params: info.arguments,
        });
      } else {
        emitNet('chat:removeSuggestion', source, `/${command}`);
      }
    }
    emitNet('chat:addSuggestions', source, suggestions);
  }

  // Replace the throw-on-call stubs from qbcore.ts.
  (QBCore as any).Commands = { Add, Refresh, List, IgnoreList };

  // ===================== Admin commands =====================
  // Same set upstream registers in commands.lua. Help/param strings go
  // through Lang.t so they translate when the locale is swapped.

  // ---------- Teleport ----------
  Add(
    'tp',
    Lang.t('command.tp.help'),
    [
      {
        name: Lang.t('command.tp.params.x.name'),
        help: Lang.t('command.tp.params.x.help'),
      },
      {
        name: Lang.t('command.tp.params.y.name'),
        help: Lang.t('command.tp.params.y.help'),
      },
      {
        name: Lang.t('command.tp.params.z.name'),
        help: Lang.t('command.tp.params.z.help'),
      },
    ],
    false,
    (source, args) => {
      if (args[0] && !args[1] && !args[2]) {
        const id = Number(args[0]);
        if (!Number.isNaN(id)) {
          const target = GetPlayerPed(String(id));
          if (target !== 0) {
            const c = GetEntityCoords(target) as unknown as [
              number,
              number,
              number,
            ];
            emitNet('QBCore:Command:TeleportToPlayer', source, {
              x: c[0],
              y: c[1],
              z: c[2],
            });
          } else {
            emitNet(
              'QBCore:Notify',
              source,
              Lang.t('error.not_online'),
              'error'
            );
          }
        } else {
          const location = (
            QBCore.Shared.Locations as Record<string, any>
          )[args[0]];
          if (location) {
            emitNet(
              'QBCore:Command:TeleportToCoords',
              source,
              location.x,
              location.y,
              location.z,
              location.w
            );
          } else {
            emitNet(
              'QBCore:Notify',
              source,
              Lang.t('error.location_not_exist'),
              'error'
            );
          }
        }
      } else if (args[0] && args[1] && args[2]) {
        const x = Number(args[0].replace(/,/g, ''));
        const y = Number(args[1].replace(/,/g, ''));
        const z = Number(args[2].replace(/,/g, ''));
        const heading = args[3]
          ? Number(args[3].replace(/,/g, ''))
          : undefined;
        if (x !== 0 && y !== 0 && z !== 0) {
          emitNet(
            'QBCore:Command:TeleportToCoords',
            source,
            x,
            y,
            z,
            heading
          );
        } else {
          emitNet(
            'QBCore:Notify',
            source,
            Lang.t('error.wrong_format'),
            'error'
          );
        }
      } else {
        emitNet(
          'QBCore:Notify',
          source,
          Lang.t('error.missing_args'),
          'error'
        );
      }
    },
    'admin'
  );

  Add('tpm', Lang.t('command.tpm.help'), [], false, (source) => {
    emitNet('QBCore:Command:GoToMarker', source);
  }, 'admin');

  Add(
    'togglepvp',
    Lang.t('command.togglepvp.help'),
    [],
    false,
    () => {
      QBCore.Config.Server.PVP = !QBCore.Config.Server.PVP;
      emitNet('QBCore:Client:PvpHasToggled', -1, QBCore.Config.Server.PVP);
    },
    'admin'
  );

  // ---------- Permissions ----------
  Add(
    'addpermission',
    Lang.t('command.addpermission.help'),
    [
      {
        name: Lang.t('command.addpermission.params.id.name'),
        help: Lang.t('command.addpermission.params.id.help'),
      },
      {
        name: Lang.t('command.addpermission.params.permission.name'),
        help: Lang.t('command.addpermission.params.permission.help'),
      },
    ],
    true,
    (source, args) => {
      const player = Functions.GetPlayer(Number(args[0])) as
        | QBPlayer
        | undefined;
      const permission = String(args[1]).toLowerCase();
      if (player) {
        Functions.AddPermission(player.PlayerData.source, permission);
      } else {
        emitNet(
          'QBCore:Notify',
          source,
          Lang.t('error.not_online'),
          'error'
        );
      }
    },
    'god'
  );

  Add(
    'removepermission',
    Lang.t('command.removepermission.help'),
    [
      {
        name: Lang.t('command.removepermission.params.id.name'),
        help: Lang.t('command.removepermission.params.id.help'),
      },
      {
        name: Lang.t('command.removepermission.params.permission.name'),
        help: Lang.t('command.removepermission.params.permission.help'),
      },
    ],
    true,
    (source, args) => {
      const player = Functions.GetPlayer(Number(args[0])) as
        | QBPlayer
        | undefined;
      const permission = String(args[1]).toLowerCase();
      if (player) {
        Functions.RemovePermission(player.PlayerData.source, permission);
      } else {
        emitNet(
          'QBCore:Notify',
          source,
          Lang.t('error.not_online'),
          'error'
        );
      }
    },
    'god'
  );

  // ---------- Open / Close server ----------
  Add(
    'openserver',
    Lang.t('command.openserver.help'),
    [],
    false,
    (source) => {
      if (!QBCore.Config.Server.Closed) {
        emitNet(
          'QBCore:Notify',
          source,
          Lang.t('error.server_already_open'),
          'error'
        );
        return;
      }
      if (Functions.HasPermission(source, 'admin')) {
        QBCore.Config.Server.Closed = false;
        emitNet(
          'QBCore:Notify',
          source,
          Lang.t('success.server_opened'),
          'success'
        );
      } else {
        Functions.Kick(source, Lang.t('error.no_permission'), null, null);
      }
    },
    'admin'
  );

  Add(
    'closeserver',
    Lang.t('command.closeserver.help'),
    [
      {
        name: Lang.t('command.closeserver.params.reason.name'),
        help: Lang.t('command.closeserver.params.reason.help'),
      },
    ],
    false,
    (source, args) => {
      if (QBCore.Config.Server.Closed) {
        emitNet(
          'QBCore:Notify',
          source,
          Lang.t('error.server_already_closed'),
          'error'
        );
        return;
      }
      if (Functions.HasPermission(source, 'admin')) {
        const reason = args[0] ?? 'No reason specified';
        QBCore.Config.Server.Closed = true;
        QBCore.Config.Server.ClosedReason = reason;
        for (const k of Object.keys(Players)) {
          const id = Number(k);
          if (
            !Functions.HasPermission(
              id,
              QBCore.Config.Server.WhitelistPermission
            )
          ) {
            Functions.Kick(id, reason, null, null);
          }
        }
        emitNet(
          'QBCore:Notify',
          source,
          Lang.t('success.server_closed'),
          'success'
        );
      } else {
        Functions.Kick(source, Lang.t('error.no_permission'), null, null);
      }
    },
    'admin'
  );

  // ---------- Vehicle ----------
  Add(
    'car',
    Lang.t('command.car.help'),
    [
      {
        name: Lang.t('command.car.params.model.name'),
        help: Lang.t('command.car.params.model.help'),
      },
    ],
    true,
    (source, args) => {
      emitNet('QBCore:Command:SpawnVehicle', source, args[0]);
    },
    'admin'
  );

  Add('dv', Lang.t('command.dv.help'), [], false, (source) => {
    emitNet('QBCore:Command:DeleteVehicle', source);
  }, 'admin');

  Add('dvall', Lang.t('command.dvall.help'), [], false, () => {
    const vehicles = (GetAllVehicles as any)() as number[];
    for (const veh of vehicles) {
      DeleteEntity(veh);
    }
  }, 'admin');

  // ---------- Peds ----------
  Add('dvp', Lang.t('command.dvp.help'), [], false, () => {
    const peds = (GetAllPeds as any)() as number[];
    for (const ped of peds) {
      DeleteEntity(ped);
    }
  }, 'admin');

  // ---------- Objects ----------
  Add('dvo', Lang.t('command.dvo.help'), [], false, () => {
    const objects = (GetAllObjects as any)() as number[];
    for (const obj of objects) {
      DeleteEntity(obj);
    }
  }, 'admin');

  // ---------- Money ----------
  Add(
    'givemoney',
    Lang.t('command.givemoney.help'),
    [
      {
        name: Lang.t('command.givemoney.params.id.name'),
        help: Lang.t('command.givemoney.params.id.help'),
      },
      {
        name: Lang.t('command.givemoney.params.moneytype.name'),
        help: Lang.t('command.givemoney.params.moneytype.help'),
      },
      {
        name: Lang.t('command.givemoney.params.amount.name'),
        help: Lang.t('command.givemoney.params.amount.help'),
      },
    ],
    true,
    (source, args) => {
      const player = Functions.GetPlayer(Number(args[0])) as
        | QBPlayer
        | undefined;
      if (player) {
        player.Functions.AddMoney(
          String(args[1]),
          Number(args[2]),
          'Admin give money'
        );
      } else {
        emitNet(
          'QBCore:Notify',
          source,
          Lang.t('error.not_online'),
          'error'
        );
      }
    },
    'admin'
  );

  Add(
    'setmoney',
    Lang.t('command.setmoney.help'),
    [
      {
        name: Lang.t('command.setmoney.params.id.name'),
        help: Lang.t('command.setmoney.params.id.help'),
      },
      {
        name: Lang.t('command.setmoney.params.moneytype.name'),
        help: Lang.t('command.setmoney.params.moneytype.help'),
      },
      {
        name: Lang.t('command.setmoney.params.amount.name'),
        help: Lang.t('command.setmoney.params.amount.help'),
      },
    ],
    true,
    (source, args) => {
      const player = Functions.GetPlayer(Number(args[0])) as
        | QBPlayer
        | undefined;
      if (player) {
        player.Functions.SetMoney(String(args[1]), Number(args[2]));
      } else {
        emitNet(
          'QBCore:Notify',
          source,
          Lang.t('error.not_online'),
          'error'
        );
      }
    },
    'admin'
  );

  // ---------- Job / Gang ----------
  Add('job', Lang.t('command.job.help'), [], false, (source) => {
    const player = Functions.GetPlayer(source) as QBPlayer | undefined;
    if (!player) return;
    const job = (player.PlayerData as any).job;
    emitNet(
      'QBCore:Notify',
      source,
      Lang.t('info.job_info', {
        value: job.label,
        value2: job.grade.name,
        value3: job.onduty,
      })
    );
  }, 'user');

  Add(
    'setjob',
    Lang.t('command.setjob.help'),
    [
      {
        name: Lang.t('command.setjob.params.id.name'),
        help: Lang.t('command.setjob.params.id.help'),
      },
      {
        name: Lang.t('command.setjob.params.job.name'),
        help: Lang.t('command.setjob.params.job.help'),
      },
      {
        name: Lang.t('command.setjob.params.grade.name'),
        help: Lang.t('command.setjob.params.grade.help'),
      },
    ],
    true,
    (source, args) => {
      const player = Functions.GetPlayer(Number(args[0])) as
        | QBPlayer
        | undefined;
      if (player) {
        player.Functions.SetJob(String(args[1]), Number(args[2]));
      } else {
        emitNet(
          'QBCore:Notify',
          source,
          Lang.t('error.not_online'),
          'error'
        );
      }
    },
    'admin'
  );

  Add('gang', Lang.t('command.gang.help'), [], false, (source) => {
    const player = Functions.GetPlayer(source) as QBPlayer | undefined;
    if (!player) return;
    const gang = (player.PlayerData as any).gang;
    emitNet(
      'QBCore:Notify',
      source,
      Lang.t('info.gang_info', {
        value: gang.label,
        value2: gang.grade.name,
      })
    );
  }, 'user');

  Add(
    'setgang',
    Lang.t('command.setgang.help'),
    [
      {
        name: Lang.t('command.setgang.params.id.name'),
        help: Lang.t('command.setgang.params.id.help'),
      },
      {
        name: Lang.t('command.setgang.params.gang.name'),
        help: Lang.t('command.setgang.params.gang.help'),
      },
      {
        name: Lang.t('command.setgang.params.grade.name'),
        help: Lang.t('command.setgang.params.grade.help'),
      },
    ],
    true,
    (source, args) => {
      const player = Functions.GetPlayer(Number(args[0])) as
        | QBPlayer
        | undefined;
      if (player) {
        player.Functions.SetGang(String(args[1]), Number(args[2]));
      } else {
        emitNet(
          'QBCore:Notify',
          source,
          Lang.t('error.not_online'),
          'error'
        );
      }
    },
    'admin'
  );

  // ---------- OOC chat ----------
  Add('ooc', Lang.t('command.ooc.help'), [], false, (source, args) => {
    const message = args.join(' ');
    const allPlayers = Functions.GetPlayers() as number[];
    const player = Functions.GetPlayer(source) as QBPlayer | undefined;
    if (!player) return;
    const playerCoords = GetEntityCoords(
      GetPlayerPed(String(source))
    ) as unknown as [number, number, number];
    const oocColor = (QBCore.Config as any).Commands?.OOCColor ?? [
      0, 153, 255,
    ];
    for (const v of allPlayers) {
      if (v === source) {
        emitNet('chat:addMessage', v, {
          color: oocColor,
          multiline: true,
          args: [`OOC | ${GetPlayerName(String(source))}`, message],
        });
        continue;
      }
      const tCoords = GetEntityCoords(
        GetPlayerPed(String(v))
      ) as unknown as [number, number, number];
      const dx = playerCoords[0] - tCoords[0];
      const dy = playerCoords[1] - tCoords[1];
      const dz = playerCoords[2] - tCoords[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 20.0) {
        emitNet('chat:addMessage', v, {
          color: oocColor,
          multiline: true,
          args: [`OOC | ${GetPlayerName(String(source))}`, message],
        });
      } else if (
        Functions.HasPermission(v, 'admin') &&
        Functions.IsOptin(v)
      ) {
        emitNet('chat:addMessage', v, {
          color: oocColor,
          multiline: true,
          args: [
            `Proximity OOC | ${GetPlayerName(String(source))}`,
            message,
          ],
        });
        emit(
          'qb-log:server:CreateLog',
          'ooc',
          'OOC',
          'white',
          `**${GetPlayerName(String(source))}** (CitizenID: ${
            (player.PlayerData as any).citizenid
          } | ID: ${source}) **Message:** ${message}`,
          false
        );
      }
    }
  }, 'user');

  // ---------- /me ----------
  Add(
    'me',
    Lang.t('command.me.help'),
    [
      {
        name: Lang.t('command.me.params.message.name'),
        help: Lang.t('command.me.params.message.help'),
      },
    ],
    false,
    (source, args) => {
      if (args.length < 1) {
        emitNet(
          'QBCore:Notify',
          source,
          Lang.t('error.missing_args2'),
          'error'
        );
        return;
      }
      const ped = GetPlayerPed(String(source));
      const pCoords = GetEntityCoords(ped) as unknown as [
        number,
        number,
        number,
      ];
      // Strip GTA chat color tags `~r~`, `<C>...</C>` etc.
      // NOTE: `.-` in Lua = lazy/minimal `.*` ; in JS regex `.-` is
      // literal dot+dash (matches nothing useful here). The correct
      // JS equivalent of Lua's `.-` is `.*?`. The earlier port had
      // the literal-`.-` form, which silently failed to strip color
      // tags — the message went through unmodified.
      const msg = args.join(' ').replace(/[~<].*?[>~]/g, '');
      const allPlayers = Functions.GetPlayers() as number[];
      for (const v of allPlayers) {
        const target = GetPlayerPed(String(v));
        const tCoords = GetEntityCoords(target) as unknown as [
          number,
          number,
          number,
        ];
        const dx = pCoords[0] - tCoords[0];
        const dy = pCoords[1] - tCoords[1];
        const dz = pCoords[2] - tCoords[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (target === ped || dist < 20) {
          emitNet('QBCore:Command:ShowMe3D', v, source, msg);
        }
      }
    },
    'user'
  );
}
