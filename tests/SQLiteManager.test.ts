import { expect } from 'chai'
import { SQLiteManager } from '../src/SQLiteManager.js'

describe('SQLiteManager', function () {

  it('get database', async () => {
    const db = await SQLiteManager.getDb()
    expect(db).to.not.equal(undefined)
  })

  it('create schema', async () => {
    const db = await SQLiteManager.getDb()
    await db.run('DROP TABLE IF EXISTS products')
    await db.run('DROP TABLE IF EXISTS categories')
    await SQLiteManager.createSchemas()
    const databases = await db.all(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%';`)
    expect(databases.map((database) => database.name)).to.contain.all.members(['categories', 'products'])
  })

  it('check if schemas exist', async () => {
    const db = await SQLiteManager.getDb()
    await db.run('DROP TABLE IF EXISTS products')
    await db.run('DROP TABLE IF EXISTS categories')
    await SQLiteManager.createSchemas()
    expect(await SQLiteManager.checkIfSchemasExist()).to.equal(true)
    await db.run('DROP TABLE IF EXISTS categories')
    expect(await SQLiteManager.checkIfSchemasExist()).to.equal(false)
    await db.run('DROP TABLE IF EXISTS products')
    expect(await SQLiteManager.checkIfSchemasExist()).to.equal(false)
    await SQLiteManager.createSchemas()
    await db.run('DROP TABLE IF EXISTS products')
    expect(await SQLiteManager.checkIfSchemasExist()).to.equal(false)
    await SQLiteManager.createSchemas()
    expect(await SQLiteManager.checkIfSchemasExist()).to.equal(true)

  })
})