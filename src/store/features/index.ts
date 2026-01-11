import { combineReducers } from '@reduxjs/toolkit';

import aboutReducer from './about/about.slice';
import articleReducer from './article/article.slice';
import authorReducer from './author/author.slice';
import creditsReducer from './credits/credits.slice';
import footerReducer from './footer/footer.slice';
import forAuthorReducer from './forAuthor/forAuthor.slice';
import i18nReducer from './i18n/i18n.slice';
import indexationReducer from './indexation/indexation.slice';
import journalReducer from './journal/journal.slice';
import newsReducer from './news/news.slice';
import searchReducer from './search/search.slice';
import sectionReducer from './section/section.slice';
import statReducer from './stat/stat.slice';
import themeReducer from './theme/theme.slice';
import volumeReducer from './volume/volume.slice';
import { aboutApi } from './about/about.query';
import { articleApi } from './article/article.query';
import { authorApi } from './author/author.query';
import { creditsApi } from './credits/credits.query';
import { forAuthorApi } from './forAuthor/forAuthor.query';
import { indexationApi } from './indexation/indexation.query';
import { journalApi } from './journal/journal.query';
import { newsApi } from './news/news.query';
import { searchApi } from './search/search.query';
import { sectionApi } from './section/section.query';
import { statApi } from './stat/stat.query';
import { volumeApi } from './volume/volume.query';

const createRootReducer = combineReducers({
  // Slices
  aboutReducer,
  articleReducer,
  authorReducer,
  creditsReducer,
  footerReducer,
  forAuthorReducer,
  i18nReducer,
  indexationReducer,
  journalReducer,
  newsReducer,
  searchReducer,
  sectionReducer,
  statReducer,
  themeReducer,
  volumeReducer,
  // RTK Query's
  [aboutApi.reducerPath]: aboutApi.reducer,
  [articleApi.reducerPath]: articleApi.reducer,
  [authorApi.reducerPath]: authorApi.reducer,
  [creditsApi.reducerPath]: creditsApi.reducer,
  [forAuthorApi.reducerPath]: forAuthorApi.reducer,
  [indexationApi.reducerPath]: indexationApi.reducer,
  [journalApi.reducerPath]: journalApi.reducer,
  [newsApi.reducerPath]: newsApi.reducer,
  [searchApi.reducerPath]: searchApi.reducer,
  [sectionApi.reducerPath]: sectionApi.reducer,
  [statApi.reducerPath]: statApi.reducer,
  [volumeApi.reducerPath]: volumeApi.reducer,
});

export type RootReducer = ReturnType<typeof createRootReducer>;

export default createRootReducer;
