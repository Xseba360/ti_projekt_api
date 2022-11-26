import sqlite3 from 'sqlite3'
import { Database, open } from 'sqlite'
import { CategoryManager } from './CategoryManager.js'
import { ProductManager } from './ProductManager.js'
import { UUID } from './types/UUID.js'
import { readFile } from 'fs/promises'
import url from 'url'
import path from 'path'

declare interface JSONProduct {
  id: string
  name: string
  category: string
  price: string
  description: string
  photos: string[]
}

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

        console.log('No schemas detected in database. Populating database with test data now...')
        const pathToFileURL = url.pathToFileURL(path.join(process.cwd(), 'data', 'produkty_poprawione.json'))
        await SQLiteManager.populateWithTestData(pathToFileURL)
        console.log('Database has been populated with test data')
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

  public static async populateWithTestData (path: URL): Promise<void> {
    const file = await this.readJsonFile(path)
    if (file.products === undefined || !Array.isArray(file.products) || !this.isJsonProductArray(file.products)) {
      if (file.products === undefined) {
        console.error('No products in file')
      }
      if (!Array.isArray(file.products)) {
        console.error('Products is not an array')
      }
      throw new Error('Invalid JSON file')
    }
    const products: JSONProduct[] = file.products
    const categoryMap = new Map<string, UUID>()
    for (const product of products) {
      let categoryUuid: UUID
      if (categoryMap.has(product.category) && categoryMap.get(product.category) !== undefined) {
        categoryUuid = categoryMap.get(product.category) as UUID
      } else {
        const category = await CategoryManager.createCategory({ name: product.category })
        categoryMap.set(product.category, category.uuid)
        categoryUuid = category.uuid
      }
      await ProductManager.createProduct({
        category: categoryUuid,
        description: product.description,
        name: product.name,
        photos: product.photos,
        price: Number(product.price.replace(' ', '').replace(',', '.'))
      })
    }
  }

  private static isJsonProductArray (products: any): products is JSONProduct[] {
    return products.every((product: any) => {
      if (product.id && product.name && product.category && product.price && product.description && product.photos && Array.isArray(product.photos)) {
        return true
      } else {
        if (!product.id) {
          console.error('Product has no id')
        }
        if (!product.name) {
          console.error('Product has no name')
        }
        if (!product.category) {
          console.error('Product has no category')
        }
        if (!product.price) {
          console.error('Product has no price')
        }
        if (!product.description) {
          console.error('Product has no description')
        }
        if (!product.photos) {
          console.error('Product has no photos')
        }
        if (!Array.isArray(product.photos)) {
          console.error('Product photos is not an array')
        }
        console.log(product)
        return false
      }
    })
  }

  private static async readJsonFile (path: URL): Promise<any> {
    const file = await readFile(path, 'utf8')
    return JSON.parse(file.trim())
  }
}
