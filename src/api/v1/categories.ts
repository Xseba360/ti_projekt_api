import { Get, Middleware, Post, Router } from '@discordx/koa'
import type { Context } from 'koa'
import { koaBody } from 'koa-body'
import { StatusCodes } from 'http-status-codes'
import { BaseCategory, CategoryCreationError, CategoryManager } from '../../CategoryManager.js'
import { UUID } from '../../types/UUID.js'
import APIKeyCheck from '../../APIKeyCheck.js'

@Router()
export class ProductsV1 {
  @Get('/v1/categories')
  categories (context: Context): void {
    context.body = JSON.stringify({
      status: 'success',
      message: 'Categories endpoint',
    })
  }

  @Get('/v1/categories/get/:uuid')
  async get (context: Context): Promise<void> {
    const category = await CategoryManager.getCategory(context.params.uuid)
    if (!category) {
      context.status = StatusCodes.NOT_FOUND
      context.body = JSON.stringify({
        status: 'error',
        message: 'Product not found',
      })
      return
    } else {
      context.body = JSON.stringify({
        status: 'success',
        category: category,
      })
      return
    }
  }

  @Get('/v1/categories/getAll')
  async getAll (context: Context): Promise<void> {
    const categories = await CategoryManager.getAllCategories()
    if (categories.length === 0) {
      context.status = StatusCodes.NOT_FOUND
      context.body = JSON.stringify({
        status: 'error',
        message: 'Categories not found',
      })
      return
    } else {
      context.body = JSON.stringify({
        status: 'success',
        categories: categories,
      })
      return
    }
  }

  @Post('/v1/categories/create')
  @Middleware(APIKeyCheck.check)
  @Middleware(koaBody())
  async create (context: Context): Promise<void> {
    try {
      const category: BaseCategory = context.request.body.category
      const categoryCreated = await CategoryManager.createCategory(category)
      context.body = JSON.stringify({
        status: 'success',
        category: categoryCreated,
      }, null, 2)
      return
    } catch (error) {
      if (error instanceof CategoryCreationError) {
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

  @Post('/v1/categories/delete')
  @Middleware(APIKeyCheck.check)
  @Middleware(koaBody())
  async delete (context: Context): Promise<void> {
    try {
      const uuid: UUID = context.request.body.uuid
      const categoryDeleted = await CategoryManager.deleteCategory(uuid)
      context.body = JSON.stringify({
        status: categoryDeleted ? 'success' : 'error',
        message: categoryDeleted ? 'Category deleted' : 'Category not found',
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