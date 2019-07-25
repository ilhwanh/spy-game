import * as express from "express"
import * as cors from "cors"
import * as uuidv1 from "uuid/v1"
// import {DAO} from "./dao"
import * as _ from "lodash"
import { Room, RoomUser, KeywordElem, GameConfig } from "../common/common"
import * as fs from "fs"

const asyncWrapper = <T> (handler: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<T>) => 
  async (req: express.Request, res: express.Response, next: express.NextFunction) =>
  await handler(req, res, next).catch(next)

const game = {
  "keyword": {
    "subjects": [
      {
        "title": "과일",
        "keywords": ["매실", "무화과", "버찌", "복분자", "복숭아", "블랙베리", "블루베리", "산딸기", "살구", "수박", "앵두", "자두", "천도복숭아", "체리", "포도", "감", "대추", "머루", "모과", "무화과", "배", "사과", "석류", "으름", "월귤", "귤", "금귤", "영귤", "유자", "레드향", "천혜향", "한라봉", "딸기", "수박", "참외", "멜론", "파인애플", "바나나"]
      },
      {
        "title": "장소",
        "keywords": ["화장실", "교실", "사무실", "집", "안방", "거실", "빌딩", "로비", "호텔", "도서관", "식당"]
      },
      {
        "title": "핸드폰",
        "keywords": ["아이폰", "갤럭시", "화웨이", "블랙베리"]
      },
      {
        "title": "걸그룹",
        "keywords": ["레드벨벳", "ITZY", "트와이스", "블랙베리"]
      }
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
    ...toDict(spies.map(userId => { return [userId, { truth: "", falses: _.shuffle([truth, ...falses]) }] })),
    ...toDict(nonSpies.map(userId => { return [userId, { truth: truth, falses: _.shuffle(falses) }] })),
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
      const key = uuidv1().slice(0, 5).toUpperCase()
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