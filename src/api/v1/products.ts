import { Get, Middleware, Post, Router } from '@discordx/koa'
import type { Context } from 'koa'
import { koaBody } from 'koa-body'
import { StatusCodes } from 'http-status-codes'
import { BaseProduct, Product, ProductCreationError, ProductManager, ProductUpdateError } from '../../ProductManager.js'
import { UUID } from '../../types/UUID.js'
import APIKeyCheck from '../../APIKeyCheck.js'
import CheckCORS from '../../CheckCORS.js'

@Router()
@Middleware(CheckCORS.check)
export class ProductsV1 {
  @Get('/api/v1/products')
  products (context: Context): void {
    context.body = JSON.stringify({
      status: 'success',
      message: 'Products endpoint',
    })
  }

  @Get('/api/v1/products/get/')
  async getNoParam (context: Context): Promise<void> {
    context.status = StatusCodes.BAD_REQUEST
    context.body = JSON.stringify({
      status: 'error',
      message: 'Missing product UUID',
    })
    return
  }

  @Get('/api/v1/products/get/:uuid')
  async get (context: Context): Promise<void> {
    if (!context.params.uuid) {
      context.status = StatusCodes.BAD_REQUEST
      context.body = JSON.stringify({
        status: 'error',
        message: 'Missing product UUID',
      })
      return
    }
    const product = await ProductManager.getProduct(context.params.uuid)
    if (!product) {
      context.status = StatusCodes.NOT_FOUND
      context.body = JSON.stringify({
        status: 'error',
        message: 'Product not found',
      })
      return
    } else {
      context.body = JSON.stringify({
        status: 'success',
        product: product,
      })
      return
    }
  }

  @Get('/api/v1/products/getAll')
  async getAll (context: Context): Promise<void> {
    const products = await ProductManager.getAllProducts()
    if (products.length === 0) {
      context.status = StatusCodes.NOT_FOUND
      context.body = JSON.stringify({
        status: 'success',
        message: 'Products not found',
        products: [],
      })
      return
    } else {
      context.body = JSON.stringify({
        status: 'success',
        products: products,
      })
      return
    }
  }

  @Get('/api/v1/products/getByCategory/')
  async getByCategoryNoParam (context: Context): Promise<void> {
    context.status = StatusCodes.BAD_REQUEST
    context.body = JSON.stringify({
      status: 'error',
      message: 'Missing category UUID',
    })
    return
  }

  @Get('/api/v1/products/getByCategory/:category')
  async getByCategory (context: Context): Promise<void> {
    if (!context.params.category) {
      context.status = StatusCodes.BAD_REQUEST
      context.body = JSON.stringify({
        status: 'error',
        message: 'Missing category',
      })
      return
    }
    const products = await ProductManager.getByCategory(context.params.category)
    if (products.length === 0) {
      context.status = StatusCodes.NOT_FOUND
      context.body = JSON.stringify({
        status: 'success',
        message: 'Products not found',
        products: [],
      })
      return
    } else {
      context.body = JSON.stringify({
        status: 'success',
        products: products,
      })
      return
    }
  }

  @Post('/api/v1/products/create')
  @Middleware(APIKeyCheck.check)
  @Middleware(koaBody())
  async create (context: Context): Promise<void> {
    try {
      const product: BaseProduct = context.request.body.product
      if (!product || !product.name || !product.price || !product.description || !product.photos || !product.category) {
        context.status = StatusCodes.BAD_REQUEST
        context.body = JSON.stringify({
          status: 'error',
          message: 'Bad product data',
        })
        return
      }
      const productCreated = await ProductManager.createProduct(product)
      context.body = JSON.stringify({
        status: 'success',
        product: productCreated,
      }, null, 2)
      return
    } catch (error) {
      if (error instanceof ProductCreationError) {
        context.status = StatusCodes.BAD_REQUEST
        context.body = JSON.stringify({
          status: 'error',
          message: error.message,
        })
        return
      } else {
        context.status = StatusCodes.INTERNAL_SERVER_ERROR
        context.body = JSON.stringify({
          status: 'error',
          message: error instanceof Error ? `ISE: ${error.message}` : 'Internal server error',
        })
        return
      }
    }
  }

  @Post('/api/v1/products/update')
  @Middleware(APIKeyCheck.check)
  @Middleware(koaBody())
  async update (context: Context): Promise<void> {
    try {
      const product: Partial<Product> & Pick<Product, 'uuid'> = context.request.body.product
      if (!product || !product.uuid) {
        context.status = StatusCodes.BAD_REQUEST
        context.body = JSON.stringify({
          status: 'error',
          message: 'Missing product or UUID',
        })
        return
      }
      const productUpdated = await ProductManager.updateProduct(product.uuid, product)
      context.body = JSON.stringify({
        status: 'success',
        product: productUpdated,
      }, null, 2)
      return
    } catch (error) {
      if (error instanceof ProductUpdateError) {
        context.status = StatusCodes.BAD_REQUEST
        context.body = JSON.stringify({
          status: 'error',
          message: error.message,
        })
        return
      } else {
        context.status = StatusCodes.INTERNAL_SERVER_ERROR
        context.body = JSON.stringify({
          status: 'error',
          message: error instanceof Error ? `ISE: ${error.message}` : 'Internal server error',
        })
        return
      }
    }
  }

  @Post('/api/v1/products/delete')
  @Middleware(APIKeyCheck.check)
  @Middleware(koaBody())
  async delete (context: Context): Promise<void> {
    try {
      const uuid: UUID = context.request.body.uuid
      if (!uuid) {
        context.status = StatusCodes.BAD_REQUEST
        context.body = JSON.stringify({
          status: 'error',
          message: 'Missing product UUID',
        })
        return
      }
      const productDeleted = await ProductManager.deleteProduct(uuid)
      context.body = JSON.stringify({
        status: productDeleted ? 'success' : 'error',
        message: productDeleted ? 'Product deleted' : 'Product not found',
      }, null, 2)
      return
    } catch (error) {
      context.status = StatusCodes.INTERNAL_SERVER_ERROR
      context.body = JSON.stringify({
        status: 'error',
        message: 'Internal server error',
      })
      return
    }
  }
}
