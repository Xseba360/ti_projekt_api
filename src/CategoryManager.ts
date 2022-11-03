import { UUID } from './types/UUID.js'

export declare interface BaseCategory {
  uuid: UUID,
}

export declare interface Category extends BaseCategory {
  name: string,
}

