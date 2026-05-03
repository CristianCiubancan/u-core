/// <reference types="@citizenfx/server" />

// Server-side port of the original qb-spawn server.lua. The original
// is one callback long: given a citizenid, fetch all rows from
// `player_houses` so the UI can list them as spawn options. Anything
// in the qb-spawn:server:* namespace that another resource may depend
// on stays verbatim.

const QBCore = (exports as any)['qb-core'].GetCoreObject();
const oxmysql = (exports as any).oxmysql;

interface PlayerHouseRow {
  house: string;
  citizenid: string;
}

QBCore.Functions.CreateCallback(
  'qb-spawn:server:getOwnedHouses',
  async (
    _source: number,
    cb: (houses: PlayerHouseRow[]) => void,
    citizenid?: string
  ) => {
    if (!citizenid) {
      cb([]);
      return;
    }
    const houses = (await oxmysql.query_async(
      'SELECT * FROM player_houses WHERE citizenid = ?',
      [citizenid]
    )) as PlayerHouseRow[] | null;

    cb(houses && houses.length > 0 ? houses : []);
  }
);
