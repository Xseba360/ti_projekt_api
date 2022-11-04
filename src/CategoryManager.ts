import { UUID } from './types/UUID.js'
import { SQLiteManager } from './SQLiteManager.js'
import * as crypto from 'crypto'

export declare interface BaseCategory {
  name: string,
}

export declare interface Category extends BaseCategory {
  uuid: UUID,
}

export class CategoryCreationError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'CategoryCreationError'
  }
}

export class CategoryUpdateError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'CategoryUpdateError'
  }
}

export class CategoryManager {
  static async getCategory (uuid: UUID): Promise<Category> {
    const db = await SQLiteManager.getDb()
    const products: Category[] = await db.all('SELECT * FROM categories WHERE uuid = ?', [uuid])
    return products[0]
  }

  static async getAllCategories (): Promise<Category[]> {
    const db = await SQLiteManager.getDb()
    return await db.all('SELECT * FROM categories', [])
  }

  static async createCategory (category: BaseCategory): Promise<Category> {
    if (!category.name) {
      throw new CategoryCreationError('Category name is required')
    }
    const db = await SQLiteManager.getDb()
    const uuid = crypto.randomUUID()

    const result = await db.run(`
                INSERT INTO categories
                    (uuid, name)
                VALUES (?, ?)`,
      [
        uuid,
        category.name,
      ])
    if (typeof result.changes !== 'number' || result.changes <= 0) {
      throw new CategoryCreationError('Failed to create category')
    }

    return {
      uuid: uuid,
      name: category.name,
    }
  }

  static async updateCategory (uuid: UUID, propsToUpdate: Partial<BaseCategory>): Promise<Category> {
    const category = await CategoryManager.getCategory(uuid)
    if (!category) {
      throw new CategoryUpdateError('Category not found')
    }
    const db = await SQLiteManager.getDb()
    if (propsToUpdate.name) {
      category.name = propsToUpdate.name
    }
    const result = await db.run(`
                UPDATE categories
                SET name = ?
                WHERE uuid = ?`,
      [
        category.name,
        uuid,
      ])
    if (typeof result.changes !== 'number' || result.changes <= 0) {
      throw new CategoryUpdateError('Failed to update category')
    }
    return category

  }

  static async deleteCategory (uuid: UUID): Promise<boolean> {
    const db = await SQLiteManager.getDb()
    const result = await db.run('DELETE FROM categories WHERE uuid = ?', [uuid])
    return typeof result.changes === 'number' && result.changes > 0

  }

}