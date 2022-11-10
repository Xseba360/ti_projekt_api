import { Get, Router } from '@discordx/koa'
import { Context } from 'koa'

@Router()
export class APIIndexV1 {
  @Get('/api/v1/')
  index (context: Context): void {
    context.body = JSON.stringify({
      status: 'error',
      message: 'Please specify a valid endpoint',
    })
  }
}
