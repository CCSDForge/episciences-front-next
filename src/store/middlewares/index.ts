import { articleApi } from '@/store/features/article/article.query'
import { authorApi } from '@/store/features/author/author.query'
import { boardApi } from '@/store/features/board/board.query'
import { creditsApi } from '@/store/features/credits/credits.query'

export const enhancedMiddleware = (getDefaultMiddleware: Function) => getDefaultMiddleware({ serializableCheck: false })
  .concat(articleApi.middleware)
  .concat(authorApi.middleware)
  .concat(boardApi.middleware)
  .concat(creditsApi.middleware) 