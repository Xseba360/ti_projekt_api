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

export declare interface ProductToUpdate {
  name: string, // TEXT
  description: string, //TEXT
  price: number, // REAL
  photos: string // TEXT
  category: Category['uuid'], // BLOB
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
  static async getProduct (uuid: UUID): Promise<Product | undefined> {
    const db = await SQLiteManager.getDb()
    const products = await db.all('SELECT * FROM products WHERE uuid = ?', [uuid])
    if (products.length >= 1) {
      products[0].photos = JSON.parse(products[0].photos)
      return products[0]
    }
    return undefined
  }

  static async getAllProducts (): Promise<Product[]> {
    const db = await SQLiteManager.getDb()
    const products = await db.all('SELECT * FROM products', [])
    for (const product of products) {
      product.photos = JSON.parse(product.photos)
    }
    return products
  }

  static async getByCategory (category: UUID): Promise<Product[]> {
    const db = await SQLiteManager.getDb()
    const products = await db.all('SELECT * FROM products WHERE category = ?', [category])
    for (const product of products) {
      product.photos = JSON.parse(product.photos)
    }
    return products
  }

  static async getRecommendedProducts (count: number): Promise<Product[]> {
    const db = await SQLiteManager.getDb()
    const products = await db.all('SELECT * FROM products ORDER BY RANDOM() LIMIT ?', [count])
    for (const product of products) {
      product.photos = JSON.parse(product.photos)
    }
    return products
  }

  static async createProduct (product: BaseProduct): Promise<Product> {
    if (!this.isValidBaseProduct(product)) {
      if (!(product as Record<string, unknown>).name) {
        throw new ProductCreationError('Product name is required')
      }
      if (!(product as Record<string, unknown>).description) {
        throw new ProductCreationError('Product description is required')
      }
      if (!(product as Record<string, unknown>).price) {
        throw new ProductCreationError('Product price is required')
      }
      if (!(product as Record<string, unknown>).photos ||
        !Array.isArray((product as Record<string, unknown>).photos) ||
        (product as Record<string, Array<any>>).photos.length <= 0 ||
        !(product as Record<string, Array<any>>).photos.every(photo => typeof (photo as unknown) === 'string')) {
        throw new ProductCreationError('Product photos is required and must be an array of strings')
      }
      if (!(product as Record<string, unknown>).category) {
        throw new ProductCreationError('Product category is required')
      }
      throw new ProductCreationError('Invalid product')
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
    const product: Product | undefined = await ProductManager.getProduct(uuid)
    if (!product) {
      throw new ProductUpdateError('Product not found')
    }
    const db = await SQLiteManager.getDb()

    if (!this.isValidPartialProduct(propsToUpdate)) {
      throw new ProductUpdateError('Invalid product to update')
    }

    //fixme: make this pretty, for now it works but it's extra ugly small brain

    // Get rid of any unwanted keys
    const finalProductToUpdate: Partial<BaseProduct> = {
      name: propsToUpdate.name || undefined,
      description: propsToUpdate.description || undefined,
      price: propsToUpdate.price || undefined,
      photos: propsToUpdate.photos || undefined,
      category: propsToUpdate.category || undefined,
    }

    // This gets inserted into the query because the photos need to be stringified
    const finalProductToUpdateDatabase: Partial<ProductToUpdate> = {
      name: finalProductToUpdate.name || undefined,
      description: finalProductToUpdate.description || undefined,
      price: finalProductToUpdate.price || undefined,
      photos: finalProductToUpdate.photos ? JSON.stringify(finalProductToUpdate.photos) : undefined,
      category: finalProductToUpdate.category || undefined,
    }

    // iterate over the keys and add them to the query
    let props: (keyof Partial<BaseProduct>)[] = []
    for (const key of Object.keys(finalProductToUpdate) as (keyof Partial<BaseProduct>)[]) {
      if (finalProductToUpdate[key] !== product[key] && finalProductToUpdate[key] !== undefined) {
        props.push(key)
      } else {
        // if this is not here returned object have undefined values if they are not updated
        delete finalProductToUpdateDatabase[key]
        delete finalProductToUpdate[key]
      }
    }

    if (props.length <= 0) {
      throw new ProductUpdateError('No properties to update')
    }

    // assign the values to the product to be returned at the end
    Object.assign(product, finalProductToUpdate)

    const result = await db.run(`
                UPDATE products
                SET ${props.join(' = ?, ') + ' = ?'}
                WHERE uuid = ?`,
      [
        ...props.map(prop => finalProductToUpdateDatabase[prop]),
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

  private static isValidBaseProduct (product: unknown): product is BaseProduct {
    return typeof product === 'object' && product !== null &&
      typeof (product as Record<string, unknown>).name === 'string' &&
      typeof (product as Record<string, unknown>).description === 'string' &&
      typeof (product as Record<string, unknown>).price === 'number' &&
      Array.isArray((product as Record<string, unknown>).photos) &&
      (product as Product).photos.every(photo => typeof (photo as unknown) === 'string') &&
      typeof (product as Record<string, unknown>).category === 'string'
  }

  private static isValidPartialProduct (product: unknown): product is Partial<Product> {
    return typeof product === 'object' && product !== null &&
      (typeof (product as Record<string, unknown>).name === 'string' || (product as Record<string, unknown>).name === undefined) &&
      (typeof (product as Record<string, unknown>).description === 'string' || (product as Record<string, unknown>).description === undefined) &&
      (typeof (product as Record<string, unknown>).price === 'number' || (product as Record<string, unknown>).price === undefined) &&
      (
        (
          Array.isArray((product as Record<string, unknown>).photos) &&
          (product as Record<string, Array<any>>).photos.every(photo => typeof (photo as unknown) === 'string')
        )
        ||
        (product as Record<string, unknown>).photos === undefined
      ) &&
      (typeof (product as Record<string, unknown>).category === 'string' || (product as Record<string, unknown>).category === undefined)

  }
}
