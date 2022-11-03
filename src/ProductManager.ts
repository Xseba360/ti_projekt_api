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

    const db = await SQLiteManager.getDb()
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
    let props: (keyof Product)[] = []
    if (propsToUpdate.name) {
      props.push('name')
      product.name = propsToUpdate.name
    }
    if (propsToUpdate.description) {
      props.push('description')
      product.description = propsToUpdate.description
    }
    if (propsToUpdate.price) {
      props.push('price')
      product.price = propsToUpdate.price
    }
    if (propsToUpdate.photos) {
      props.push('photos')
      product.photos = propsToUpdate.photos
    }
    if (propsToUpdate.category) {
      props.push('category')
      product.category = propsToUpdate.category
    }
    if (props.length <= 0) {
      throw new ProductUpdateError('No properties to update')
    }
    const result = await db.run(`
                UPDATE products
                SET ${props.join(' = ?, ') + ' = ?'}
                WHERE uuid = ?`,
      [
        ...props.map(prop => product[prop]),
        uuid,
      ])

    if (typeof result.changes !== 'number' || result.changes <= 0) {
      throw new ProductUpdateError('Product update failed')
    }

    return product
  }

  static async deleteProduct (uuid: UUID): Promise<boolean> {
    const db = await SQLiteManager.getDb()
    const result = await db.run('DELETE FROM products WHERE uuid = ?', [uuid])
    return typeof result.changes === 'number' && result.changes > 0
  }

}