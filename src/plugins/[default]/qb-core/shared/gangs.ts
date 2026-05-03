// Direct port of qb-core/shared/gangs.lua. Same shape, same keys.
// Drop-in for `QBCore.Shared.Gangs` consumers (qb-gangmenu, etc.).

export interface GangGrade {
  name: string;
  isboss?: boolean;
}

export interface Gang {
  label: string;
  /** Keys are stringified integers ('0', '1', ...) to match upstream
   *  Lua tables. Downstream resources index `Gangs.lostmc.grades['0']`. */
  grades: Record<string, GangGrade>;
}

export const Gangs: Record<string, Gang> = {
  none: { label: 'No Gang', grades: { '0': { name: 'Unaffiliated' } } },
  lostmc: {
    label: 'The Lost MC',
    grades: {
      '0': { name: 'Recruit' },
      '1': { name: 'Enforcer' },
      '2': { name: 'Shot Caller' },
      '3': { name: 'Boss', isboss: true },
    },
  },
  ballas: {
    label: 'Ballas',
    grades: {
      '0': { name: 'Recruit' },
      '1': { name: 'Enforcer' },
      '2': { name: 'Shot Caller' },
      '3': { name: 'Boss', isboss: true },
    },
  },
  vagos: {
    label: 'Vagos',
    grades: {
      '0': { name: 'Recruit' },
      '1': { name: 'Enforcer' },
      '2': { name: 'Shot Caller' },
      '3': { name: 'Boss', isboss: true },
    },
  },
  cartel: {
    label: 'Cartel',
    grades: {
      '0': { name: 'Recruit' },
      '1': { name: 'Enforcer' },
      '2': { name: 'Shot Caller' },
      '3': { name: 'Boss', isboss: true },
    },
  },
  families: {
    label: 'Families',
    grades: {
      '0': { name: 'Recruit' },
      '1': { name: 'Enforcer' },
      '2': { name: 'Shot Caller' },
      '3': { name: 'Boss', isboss: true },
    },
  },
  triads: {
    label: 'Triads',
    grades: {
      '0': { name: 'Recruit' },
      '1': { name: 'Enforcer' },
      '2': { name: 'Shot Caller' },
      '3': { name: 'Boss', isboss: true },
    },
  },
};
