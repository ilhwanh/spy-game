import * as express from "express"
import * as cors from "cors"
import * as uuidv1 from "uuid/v1"
import {DAO} from "./dao"
import * as _ from "lodash"


const asyncWrapper = <T> (handler: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<T>) => 
  async (req: express.Request, res: express.Response, next: express.NextFunction) =>
  await handler(req, res, next).catch(next)


class Server {
  public app: express.Application
  public dao = DAO.bootstrap()

  public static bootstrap(): Server {
    return new Server()
  }

  constructor() {
    this.app = express()
    this.app.use(express.json())
    this.app.use(cors())

    this.app.get("/", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.log(`home ${req.ip}`)
      res.send("Sunny Side Up!")
    })

    this.app.post("/get-user-id", (req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.log(`get-user-id ${req.ip}`)
      const uuid = uuidv1()
      res.send(JSON.stringify({
        success: true,
        payload: {
          userId: uuid
        }
      }))
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
const portServer = 37123
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