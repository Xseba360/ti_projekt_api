import { Next } from 'koa'
import { RouterContext } from '@koa/router'

export default class CheckCORS {
  static async check (ctx: RouterContext, next: Next): Promise<void> {
    //todo: keep a list of allowed origins
    if (ctx.request.headers.origin) {
      ctx.res.setHeader('Access-Control-Allow-Origin', ctx.request.headers.origin)
    }
    await next()
  }
}
