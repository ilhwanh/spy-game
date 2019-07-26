import * as express from "express"
import * as cors from "cors"
import * as uuidv1 from "uuid/v1"
// import {DAO} from "./dao"
import * as _ from "lodash"
import { Room, RoomUser, KeywordElem, GameConfig } from "../common/common"

const asyncWrapper = <T> (handler: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<T>) => 
  async (req: express.Request, res: express.Response, next: express.NextFunction) =>
  await handler(req, res, next).catch(next)

const game = {
  "keyword": {
    "subjects": [
      {
        "title": "음식",
        "keywords": ["김치찌개", "레드벨벳케이크", "연어초밥", "유산슬", "수박", "삶은계란", "에스프레소", "살치살스테이크", "두리안", "피클"]
      },
      {
        "title": "장소",
        "keywords": ["공중화장실", "사무실", "남의 집 거실", "63빌딩", "조선호텔로비", "도서관", "미술관", "식당", "강의실", "갑판", "지하창고"]
      },
      {
        "title": "가전 및 가구",
        "keywords": ["에어콘", "핸드폰", "컴퓨터", "TV", "거울", "비누", "치약", "린스", "주방세제", "공유기", "세탁기", "나무주걱", "냄비"]
      },
      {
        "title": "노래",
        "keywords": ["빨간맛", "애국가", "텔미", "밤의여왕", "자장가", "응급실", "장군님축지법쓰신다", "샤론의꽃보다", "She's gone", "미로틱"]
      },
    ]
  }
}

const keywordSet = game.keyword.subjects

const choice = <T> (arr: T[]) => {
  return arr[Math.floor(Math.random() * arr.length)]
}

export const toDict = <T> (pairs: [string, T][]) => {
  return pairs.map(([key, value]) => { return { [key]: value } }).reduce((a, b) => { return { ...a, ...b } })
}

const getContents = (userIds: string[], config: GameConfig) => {
  const userIdsShuffled = _.shuffle(userIds)
  const spies = userIdsShuffled.slice(0, config.numSpies)
  const nonSpies = userIdsShuffled.slice(config.numSpies, userIdsShuffled.length)

  const keywords = _.shuffle(config.mix ? _.flatMap(keywordSet, elem => elem.keywords) : choice(keywordSet).keywords)
  const truth = keywords[0]
  const falses = keywords.slice(1, config.numFalses + 1)

  return {
    ...toDict(spies.map(userId => { return [userId, { truth: "", falses: _.shuffle([truth, ...falses]) }] }) as [string, KeywordElem][]),
    ...toDict(nonSpies.map(userId => { return [userId, { truth: truth, falses: _.shuffle(falses) }] }) as [string, KeywordElem][])
  } as Record<string, KeywordElem>
}

class Server {
  app: express.Application
  // dao = DAO.bootstrap()
  rooms: Record<string, Room> = {}

  maxTimeToLive = 10000
  stepInterval = 500
  disconnectedInterval = 3000

  static bootstrap(): Server {
    return new Server()
  }

  step = () => {
    _.toPairs(this.rooms).forEach(([roomKey, room]) => {
      _.toPairs(room.users).forEach(([userId, user]) => {
        user.timeToLive -= this.stepInterval
        if (room.users[userId].status ==="active" && user.timeToLive <= this.maxTimeToLive - this.disconnectedInterval) {
          console.log(`${user.name} (${userId}) in room ${roomKey} is not responding`)
          room.users[userId].status = "disconnected"
        }
        if (user.timeToLive <= 0) {
          console.log(`${user.name} (${userId}) is timed out from room ${roomKey}`)
          this.quitFromRoom(roomKey, userId)
        }
      })
    })

    setTimeout(() => { this.step() }, this.stepInterval)
  }

  generateRoomKey = () => {
    while (true) {
      const key = uuidv1().slice(0, 3).toUpperCase()
      if (!(key in this.rooms)) {
        return key
      }
    }
  }

  expireRoom = (roomKey: string) => {
    console.log(`Room ${roomKey} has nobody inside. Expired.`)
    delete this.rooms[roomKey]
  }

  quitFromRoom = (roomKey: string, userId: string) => {
    const room = this.rooms[roomKey]
    delete room.users[userId]
    if (room.master === userId) {
      if (_.keys(room.users).length > 0) {
        const newMaster = _.keys(room.users)[0]
        room.master = newMaster
      }
      else {
        this.expireRoom(roomKey)
      }
    }
  }

  constructor() {
    setTimeout(() => { this.step() }, this.stepInterval)

    this.app = express()
    this.app.use(express.json())
    this.app.use(cors())
    this.rooms = {}

    this.app.get("/", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.log(`home ${req.ip}`)
      res.send("Sunny Side Up!")
    })

    this.app.post("/make-room", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.log(`make-room ${req.ip}`)
      const roomKey = this.generateRoomKey()
      this.rooms[roomKey] = { master: null, page: "idle", content: {}, users: {}, gamemode: "same", round: 0 }
      res.send(JSON.stringify({
        success: true,
        payload: {
          roomKey: roomKey
        }
      }))
    })

    this.app.post("/join-room", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.log(`join-room ${req.ip}`)
      const body = req.body as { roomKey: string, name: string }
      if (body.roomKey in this.rooms) {
        const uuidUser = uuidv1()
        const roomUser = { name: body.name, timeToLive: this.maxTimeToLive, status: "active" }
        const room = this.rooms[body.roomKey]
        if (room.master === null) {
          room.master = uuidUser
        }
        room.users[uuidUser] = roomUser
        res.send(JSON.stringify({
          success: true,
          payload: {
            userId: uuidUser
          }
        }))
      }
      else {
        res.send(JSON.stringify({
          success: false,
          payload: {}
        }))
      }
    })

    this.app.post("/quit-room", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.log(`quit-room ${req.ip}`)
      const body = req.body as { roomKey: string, userId: string }
      if (body.roomKey in this.rooms) {
        const room = this.rooms[body.roomKey]
        if (body.userId in room.users) {
          this.quitFromRoom(body.roomKey, body.userId)
          res.send(JSON.stringify({
            success: true,
            payload: {}
          }))
        }
        else {
          res.send(JSON.stringify({
            success: false,
            payload: {}
          }))
        }
      }
      else {
        res.send(JSON.stringify({
          success: false,
          payload: {}
        }))
      }
    })

    this.app.post("/heartbeat", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.log(`heartbeat ${req.ip}`)
      const body = req.body as { roomKey: string, userId: string  }
      if (body.roomKey in this.rooms) {
        const room = this.rooms[body.roomKey]
        if (body.userId in room.users) {
          const roomUser = room.users[body.userId]
          roomUser.timeToLive = this.maxTimeToLive
          roomUser.status = "active"

          res.send(JSON.stringify({
            success: true,
            payload: {
              isMaster: room.master === body.userId,
              content: room.content[body.userId],
              round: room.round,
              page: room.page,
              users: room.users
            }
          }))
        }
        else {
          res.send(JSON.stringify({
            success: false,
            payload: {}
          }))
        }
      }
      else {
        res.send(JSON.stringify({
          success: false,
          payload: {}
        }))
      }
    })

    this.app.post("/start-round", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.log(`start-round ${req.ip}`)
      const body = req.body as { roomKey: string, userId: string, config: GameConfig }
      if (body.roomKey in this.rooms) {
        const room = this.rooms[body.roomKey]
        const content = getContents(_.keys(room.users), body.config)
        room.round += 1
        room.content = content
        if (room.master === body.userId) {
          res.send(JSON.stringify({
            success: true,
            payload: {}
          }))
        }
        else {
          res.send(JSON.stringify({
            success: false,
            payload: {}
          }))
        }
      }
      else {
        res.send(JSON.stringify({
          success: false,
          payload: {}
        }))
      }
    })

    this.app.post("/stop-round", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.log(`stop-round ${req.ip}`)
      const body = req.body as { roomKey: string, userId: string }
      if (body.roomKey in this.rooms) {
        const room = this.rooms[body.roomKey]
        room.content = {}
        if (room.master === body.userId) {
          res.send(JSON.stringify({
            success: true,
            payload: {}
          }))
        }
        else {
          res.send(JSON.stringify({
            success: false,
            payload: {}
          }))
        }
      }
      else {
        res.send(JSON.stringify({
          success: false,
          payload: {}
        }))
      }
    })
  }
}


class Client {
  public app: express.Application

  public static bootstrap(): Client {
    return new Client()
  }

  constructor() {
    this.app = express()
    this.app.use(express.json())
    this.app.use(express.static('dist'))
    this.app.use(cors())

    this.app.get("/", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.log(`home ${req.ip}`)
      res.render('dist/index.html')
    })
  }
}

const appServer = new Server().app
const portServer = 56087
const appClient = new Client().app
const portClient = 80

if (process.argv.indexOf("--dev") >= 0) {
  appServer
    .listen(portServer, () => console.log(`Express server (server) listening at ${portServer}`))
    .on('error', err => console.error(err));
}
else {
  appServer
    .listen(portServer, () => console.log(`Express server (server) listening at ${portServer}`))
    .on('error', err => console.error(err));

  appClient
    .listen(portClient, () => console.log(`Express server (client) listening at ${portClient}`))
    .on('error', err => console.error(err));
}