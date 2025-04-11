'use client';

import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage/session';
import { setupListeners } from '@reduxjs/toolkit/query';
import { Middleware } from '@reduxjs/toolkit';

import rootReducer, { RootReducer } from './features';
import { aboutApi } from './features/about/about.query';
import { articleApi } from './features/article/article.query';
import { authorApi } from './features/author/author.query';
import { boardApi } from './features/board/board.query';
import { creditsApi } from './features/credits/credits.query';
import { forAuthorApi } from './features/forAuthor/forAuthor.query';
import { indexationApi } from './features/indexation/indexation.query';
import { journalApi } from './features/journal/journal.query';
import { newsApi } from './features/news/news.query';
import { searchApi } from './features/search/search.query';
import { sectionApi } from './features/section/section.query';
import { statApi } from './features/stat/stat.query';
import { volumeApi } from './features/volume/volume.query';

// Check if we're in a browser environment
const isClient = typeof window !== 'undefined';

// Create a simple storage object that works in both client and server
const createNoopStorage = () => {
  return {
    getItem() {
      return Promise.resolve(null);
    },
    setItem(key: string, item: any) {
      return Promise.resolve(item);
    },
    removeItem() {
      return Promise.resolve();
    },
  };
};

const persistConfig = {
  key: 'root',
  storage: isClient ? storage : createNoopStorage(),
  whitelist: ['journalReducer', 'i18nReducer', 'themeReducer'], // Only persist these reducers
};

// Create store with conditional persistence
const persistedReducer = isClient ? persistReducer(persistConfig, rootReducer) : rootReducer;

export const store = configureStore({
  // @ts-ignore - Temporarily ignore type issues with redux-persist
  reducer: persistedReducer,
  // @ts-ignore - Temporarily ignore type issues with middleware concatenation
  middleware: (getDefaultMiddleware) => {
    const middleware = getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
      immutableCheck: { warnAfter: 128 },
    });

    return middleware
      .concat(aboutApi.middleware)
      .concat(articleApi.middleware)
      .concat(authorApi.middleware)
      .concat(boardApi.middleware)
      .concat(creditsApi.middleware)
      .concat(forAuthorApi.middleware)
      .concat(indexationApi.middleware)
      .concat(journalApi.middleware)
      .concat(newsApi.middleware)
      .concat(searchApi.middleware)
      .concat(sectionApi.middleware)
      .concat(statApi.middleware)
      .concat(volumeApi.middleware);
  },
  devTools: process.env.NODE_ENV !== 'production',
});

// Setup listeners for RTK Query
if (isClient) {
  setupListeners(store.dispatch);
}

// Only create persistor on client side
export const persistor = isClient ? persistStore(store) : null;

export type AppDispatch = typeof store.dispatch;
export type AppState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  AppState,
  unknown,
  Action<string>
>;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;

export default store; 