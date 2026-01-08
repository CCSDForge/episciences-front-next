import { createSlice } from '@reduxjs/toolkit';
import { articleApi } from '.';
import { IArticleState } from './article.type';

const articleSlice = createSlice({
  name: 'article',
  initialState: {
    articles: {
      data: [],
      totalItems: 0,
    },
  } as IArticleState,
  reducers: {},
  extraReducers: builder => {
    builder.addMatcher(articleApi.endpoints.fetchArticles.matchFulfilled, (state, action) => {
      state.articles = action.payload;
    });
  },
});

export default articleSlice.reducer;
