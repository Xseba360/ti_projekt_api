import { Get, Router } from '@discordx/koa'
import type { Context } from 'koa'

@Router()
export class Index {
  @Get('/')
  index (context: Context): void {
    context.body = JSON.stringify({
      status: 'error',
      message: 'API version is not specified',
    })
  }
}
