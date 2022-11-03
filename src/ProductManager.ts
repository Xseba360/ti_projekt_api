import { Category } from './CategoryManager.js'
import { UUID } from './types/UUID.js'
import { SQLiteManager } from './SQLiteManager.js'
import * as crypto from 'crypto'

export declare interface BaseProduct {
  name: string,
  description: string,
  price: number,
  photos: string[],
  category: Category['uuid'],
}

export declare interface Product extends BaseProduct {
  uuid: UUID,
}

export declare interface JSONProduct extends BaseProduct {
  id: string,
}

export class ProductCreationError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'ProductCreationError'
  }
}

export class ProductUpdateError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'ProductUpdateError'
  }
}

export class ProductManager {
  static async getProduct (uuid: UUID): Promise<Product> {
    const db = await SQLiteManager.getDb()
    const products: Product[] = await db.all('SELECT * FROM products WHERE uuid = ?', [uuid])
    return products[0]
  }

  static async getAllProducts (): Promise<Product[]> {
    const db = await SQLiteManager.getDb()
    return await db.all('SELECT * FROM products', [])

  }

  static async createProduct (product: BaseProduct): Promise<Product> {
    const db = await SQLiteManager.getDb()

    if (!product.name) {
      throw new ProductCreationError('Product name is required')
    }
    if (!product.description) {
      throw new ProductCreationError('Product description is required')
    }
    if (!product.price) {
      throw new ProductCreationError('Product price is required')
    }
    if (!product.photos || !Array.isArray(product.photos) || product.photos.length <= 0) {
      throw new ProductCreationError('Product photos is required')
    }
    if (!product.category) {
      throw new ProductCreationError('Product category is required')
    }
    const uuid = crypto.randomUUID()

    const result = await db.run(`
                INSERT INTO products
                    (uuid, name, description, price, photos, category)
                VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uuid,
        product.name,
        product.description,
        product.price,
        JSON.stringify(product.photos),
        product.category
      ])
    if (typeof result.changes !== 'number' || result.changes <= 0) {
      throw new ProductCreationError('Product creation failed')
    }
    return {
      uuid: uuid,
      name: product.name,
      description: product.description,
      price: product.price,
      photos: product.photos,
      category: product.category,
    }

  }

  static async updateProduct (uuid: UUID, propsToUpdate: Partial<BaseProduct>): Promise<Product> {
    const product = await ProductManager.getProduct(uuid)
    if (!product) {
      throw new ProductUpdateError('Product not found')
    }
    const db = await SQLiteManager.getDb()
    for (const prop in propsToUpdate) {
      if (propsToUpdate.hasOwnProperty(prop)) {
        if (product[prop as keyof BaseProduct] !== propsToUpdate[prop as keyof BaseProduct]) {
          // todo: continue working here
        }
      }
    }
    return { // todo: return updated product
      category: '', description: '', name: '', photos: [], price: 0, uuid: ''
    }
  }

  static async deleteProduct (uuid: UUID): Promise<void> {
    // todo: implement
  }

}