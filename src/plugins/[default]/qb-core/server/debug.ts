/// <reference types="@citizenfx/server" />

// Direct port of qb-core/server/debug.lua. The recursive `tPrint`
// table walker, the `QBCore:DebugSomething` net event handler, and
// the `QBCore.Debug` / `ShowError` / `ShowSuccess` console helpers.
//
// Color codes use the FXServer-friendly `^N` syntax for the helper
// methods, and ANSI escape codes for tPrint to match upstream's
// dump output exactly (downstream tooling that scrapes the console
// for `\x1b[36m[...:DEBUG]` prefixes keeps working).

import type { QBCoreShape } from './qbcore';

function tPrint(tbl: unknown, indent = 0): void {
  if (tbl !== null && typeof tbl === 'object') {
    for (const [k, v] of Object.entries(tbl as Record<string, unknown>)) {
      const formatting = `${'  '.repeat(indent)} \x1b[33m${k}:\x1b[0m`;
      if (v !== null && typeof v === 'object') {
        console.log(formatting);
        tPrint(v, indent + 1);
      } else if (typeof v === 'boolean') {
        console.log(`${formatting}\x1b[31m ${v} \x1b[0m`);
      } else if (typeof v === 'function') {
        console.log(`${formatting}\x1b[39m ${v} \x1b[0m`);
      } else if (typeof v === 'number') {
        console.log(`${formatting}\x1b[35m ${v} \x1b[0m`);
      } else if (typeof v === 'string') {
        console.log(`${formatting} \x1b[32m'${v}' \x1b[0m`);
      } else {
        console.log(`${formatting}\x1b[32m ${String(v)} \x1b[0m`);
      }
    }
  } else {
    console.log(`${'  '.repeat(indent)} \x1b[0m${String(tbl)}`);
  }
}

export function installDebug(QBCore: QBCoreShape): void {
  on(
    'QBCore:DebugSomething',
    (tbl: unknown, indent: number, resource: string) => {
      console.log(`\x1b[4m\x1b[36m[ ${resource} : DEBUG]\x1b[0m`);
      tPrint(tbl, indent);
      console.log('\x1b[4m\x1b[36m[ END DEBUG ]\x1b[0m');
    }
  );

  (QBCore as any).Debug = (tbl: unknown, indent?: number): void => {
    emit(
      'QBCore:DebugSomething',
      tbl,
      indent,
      GetInvokingResource() ?? 'qb-core'
    );
  };

  (QBCore as any).ShowError = (resource: string, msg: string): void => {
    console.log(`\x1b[31m[${resource}:ERROR]\x1b[0m ${msg}`);
  };

  (QBCore as any).ShowSuccess = (resource: string, msg: string): void => {
    console.log(`\x1b[32m[${resource}:LOG]\x1b[0m ${msg}`);
  };
}
