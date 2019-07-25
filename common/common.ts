export interface Room {
  master: string | null,
  page: string,
  gamemode: string,
  content: Record<string, KeywordElem>,
  users: Record<string, RoomUser>,
  round: number
}

export interface RoomUser {
  name: string,
  timeToLive: number,
  status: string
}

export interface GameConfig {
  numSpies: number,
  mix: boolean,
  numFalses: number
}

export interface KeywordElem {
  truth: string
  falses: string[]
}