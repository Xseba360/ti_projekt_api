import { Get, Middleware, Post, Router } from '@discordx/koa'
import type { Context } from 'koa'
import { koaBody } from 'koa-body'
import { StatusCodes } from 'http-status-codes'
import { BaseProduct, ProductCreationError, ProductManager } from '../../ProductManager.js'
import { UUID } from '../../types/UUID.js'
import APIKeyCheck from '../../APIKeyCheck.js'

@Router()
export class ProductsV1 {
  @Get('/v1/products')
  products (context: Context): void {
    context.body = JSON.stringify({
      status: 'success',
      message: 'Products endpoint',
    })
  }

  @Get('/v1/products/get/:uuid')
  async get (context: Context): Promise<void> {
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

  @Get('/v1/products/getAll')
  async getAll (context: Context): Promise<void> {
    const products = await ProductManager.getAllProducts()
    if (products.length === 0) {
      context.status = StatusCodes.NOT_FOUND
      context.body = JSON.stringify({
        status: 'error',
        message: 'Products not found',
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

  @Post('/v1/products/create')
  @Middleware(APIKeyCheck.check)
  @Middleware(koaBody())
  async create (context: Context): Promise<void> {
    try {
      const product: BaseProduct = context.request.body.product
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

  @Post('/v1/products/delete')
  @Middleware(APIKeyCheck.check)
  @Middleware(koaBody())
  async delete (context: Context): Promise<void> {
    try {
      const uuid: UUID = context.request.body.uuid
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