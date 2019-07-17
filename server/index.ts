import * as express from "express"
import * as cors from "cors"
import * as uuidv1 from "uuid/v1"
// import {DAO} from "./dao"
import * as _ from "lodash"
import { Room, RoomUser } from "../common/common"

const asyncWrapper = <T> (handler: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<T>) => 
  async (req: express.Request, res: express.Response, next: express.NextFunction) =>
  await handler(req, res, next).catch(next)


class Server {
  app: express.Application
  // dao = DAO.bootstrap()
  rooms: Record<string, Room> = {}

  maxTimeToLive = 20000
  stepInterval = 500
  disconnectedInterval = 5000

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
          delete room.users[userId]
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
      this.rooms[roomKey] = { master: null, page: "idle", content: null, users: {} }
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
          delete room.users[body.userId]
          if (room.master === body.userId) {
            if (_.keys(room.users).length > 0) {
              const newMaster = _.keys(room.users)[0]
              room.master = newMaster
            }
            else {
              this.expireRoom(body.roomKey)
            }
          }
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
              content: room.content,
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