export interface Room {
  master: string | null,
  page: string,
  gamemode: string,
  content: Record<string, ContentSame>,
  users: Record<string, RoomUser>,
  round: number
}

export interface RoomUser {
  name: string,
  timeToLive: number,
  status: string
}

export interface ConfigSame {
  subject: string,
  random: boolean
}

export interface ContentSame {
  keyword: string
}