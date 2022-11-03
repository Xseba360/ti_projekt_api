import sqlite3 from 'sqlite3'
import { Database, open } from 'sqlite'

export class SQLiteManager {
  private static database: Database

  public static async getDb () {
    if (!this.database) {
      this.database = await open({
        filename: './data/database.sqlite',
        driver: sqlite3.Database,
      })
    }
    return this.database
  }
}