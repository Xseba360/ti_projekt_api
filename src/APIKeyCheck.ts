import { StatusCodes } from 'http-status-codes'
import { Next } from 'koa'
import { RouterContext } from '@koa/router'

export default class APIKeyCheck {
  static async check (ctx: RouterContext, next: Next): Promise<void> {
    if (!ctx.request.body.apiKey || ctx.request.body.apiKey !== process.env.API_KEY) {
      ctx.status = StatusCodes.UNAUTHORIZED
      ctx.body = JSON.stringify({
        status: 'error',
        message: 'Unauthorized',
      })
      return
    }
    await next();
  }
}