import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';

import { articleApi } from './features/article/article.query';
import { volumeApi } from './features/volume/volume.query';
import { aboutApi } from './features/about/about.query';
import i18nReducer from './features/i18n/i18n.slice';
import journalReducer from './features/journal/journal.slice';
import volumeReducer from './features/volume/volume.slice';

export const store = configureStore({
  reducer: {
    [articleApi.reducerPath]: articleApi.reducer,
    [volumeApi.reducerPath]: volumeApi.reducer,
    [aboutApi.reducerPath]: aboutApi.reducer,
    i18nReducer,
    journalReducer,
    volumeReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(articleApi.middleware, volumeApi.middleware, aboutApi.middleware)
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 