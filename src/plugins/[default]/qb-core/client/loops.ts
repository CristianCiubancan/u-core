/// <reference types="@citizenfx/client" />

// Direct port of qb-core/client/loops.lua. Two background workers:
//   - Periodic player update: triggers QBCore:UpdatePlayer on the
//     server every UpdateInterval minutes (saves position + drains
//     hunger/thirst).
//   - Hunger/thirst damage: when hunger or thirst hit 0 and the
//     player is alive, decrement health by 5–10 every StatusInterval
//     ms.
// Both gate on `LocalPlayer.state.isLoggedIn` to avoid running
// against an unloaded player.

import type { QBCoreClient } from './qbcore';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isLoggedIn(): boolean {
  try {
    return !!(LocalPlayer as any).state?.isLoggedIn;
  } catch {
    return false;
  }
}

export function installClientLoops(QBCore: QBCoreClient): void {
  // Periodic player update — save state.
  void (async () => {
    while (true) {
      if (isLoggedIn()) {
        emitNet('QBCore:UpdatePlayer');
        await sleep(60_000 * QBCore.Config.UpdateInterval);
      } else {
        await sleep(1000);
      }
    }
  })();

  // Hunger/thirst damage tick.
  void (async () => {
    while (true) {
      if (isLoggedIn()) {
        const meta = (QBCore.PlayerData.metadata ?? {}) as Record<
          string,
          unknown
        >;
        const hunger = Number(meta.hunger ?? 100);
        const thirst = Number(meta.thirst ?? 100);
        const isDead = !!meta.isdead;
        const inLastStand = !!meta.inlaststand;
        if ((hunger <= 0 || thirst <= 0) && !isDead && !inLastStand) {
          const ped = PlayerPedId();
          const cur = GetEntityHealth(ped);
          const drop = Math.floor(Math.random() * 6) + 5; // 5..10
          SetEntityHealth(ped, cur - drop);
        }
      }
      await sleep(QBCore.Config.StatusInterval);
    }
  })();
}
