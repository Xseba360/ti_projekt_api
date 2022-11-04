import sqlite3 from 'sqlite3'
import { Database, open } from 'sqlite'

export class SQLiteManager {
  private static database: Database

  public static async getDb (): Promise<Database> {
    if (!this.database) {
      this.database = await open({
        filename: './data/database.sqlite',
        driver: sqlite3.Database,
      })
      if (!await this.checkIfSchemasExist()) {
        await this.createSchemas()
      }
    }
    return this.database
  }

  public static async checkIfSchemasExist (): Promise<boolean> {
    const db = await this.getDb()
    const databases = await db.all(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%';`)
    const databaseNames = databases.map((database) => database.name)
    return databaseNames.includes('categories') && databaseNames.includes('products')
  }

  public static async createSchemas (): Promise<void> {
    const db = await this.getDb()
    await db.run(`
        CREATE TABLE IF NOT EXISTS categories
        (
            uuid BLOB
                CONSTRAINT categories_pk
                    PRIMARY KEY,
            name TEXT NOT NULL
        )
    `)
    await db.run(`
        CREATE UNIQUE INDEX IF NOT EXISTS categories_uuid_uindex
            ON categories (uuid);
    `)
    await db.run(`
        CREATE TABLE IF NOT EXISTS products
        (
            uuid        BLOB
                CONSTRAINT products_pk
                    PRIMARY KEY,
            name        TEXT NOT NULL,
            price       REAL NOT NULL,
            photos      TEXT NOT NULL,
            description TEXT NOT NULL,
            category    BLOB NOT NULL,
            FOREIGN KEY (category) REFERENCES categories (uuid)
        )
    `)
    await db.run(`
        CREATE UNIQUE INDEX IF NOT EXISTS products_uuid_uindex
            ON products (uuid);
    `)
  }
}
