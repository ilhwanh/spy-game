import * as sqlite3 from "sqlite3"


export class DAO {
  public db = new sqlite3.Database("spy-game.db")

  public static bootstrap = () => new DAO()

  getNewQuestions = (num: number) => {
    return new Promise<{ question_id: string }[]>((resolve, reject) => {
      this.db.all(`
        SELECT
          questions.question_id
        FROM
          questions
        ORDER BY
          RANDOM()
        LIMIT
          ?
      `, [num], (err, rows) => {
        if (err) {
          reject(err);
        }
        resolve(rows)
      })
    })
  }
}