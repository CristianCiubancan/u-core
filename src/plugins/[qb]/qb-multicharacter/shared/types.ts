// Wire types used by both NUI and game-side code. The character row
// shape mirrors what `setupCharacters` returns from the players table —
// charinfo / money / job arrive JSON-decoded by the server callback.

export interface CharInfo {
  firstname: string;
  lastname: string;
  birthdate: string;
  gender: number | string;
  nationality: string;
  phone?: string;
  account?: string;
  cid?: number | string;
}

export interface MoneyInfo {
  cash: number;
  bank: number;
  crypto?: number;
}

export interface JobInfo {
  name: string;
  label: string;
  grade?: { level: number; name: string };
  onduty?: boolean;
  isboss?: boolean;
}

export interface CharacterRow {
  citizenid: string;
  cid: number;
  license: string;
  name?: string;
  charinfo: CharInfo;
  money: MoneyInfo;
  job: JobInfo;
  position?: string;
}

export interface NewCharacterPayload {
  firstname: string;
  lastname: string;
  nationality: string;
  birthdate: string;
  gender: number | string;
  cid: number;
}

export interface SetupCharactersPayload {
  characters: CharacterRow[];
}
