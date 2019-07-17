import * as sqlite3 from "sqlite3"


export class DAO {
  public db = new sqlite3.Database("spy-game.db")

  public static bootstrap = () => new DAO()
}