export interface Room {
  master: string | null,
  page: string,
  content: any,
  users: Record<string, RoomUser>
}

export interface RoomUser {
  name: string,
  timeToLive: number,
  status: string
}
