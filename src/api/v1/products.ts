import { Get, Middleware, Post, Router } from '@discordx/koa'
import type { Context } from 'koa'
import { koaBody } from 'koa-body'
import { StatusCodes } from 'http-status-codes'
import { BaseProduct, ProductCreationError, ProductManager } from '../../ProductManager.js'

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
  @Middleware(koaBody())
  async create (context: Context): Promise<void> {
    const product: BaseProduct = context.request.body
    try {
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
      } else if (error instanceof Error) {
        context.status = StatusCodes.INTERNAL_SERVER_ERROR
        context.body = JSON.stringify({
          status: 'error',
          message: 'Internal server error\n' + error.message,
        })
        return
      } else {
        context.status = StatusCodes.INTERNAL_SERVER_ERROR
        context.body = JSON.stringify({
          status: 'error',
          message: 'Internal server error',
        })
        return
      }
    }
  }
}