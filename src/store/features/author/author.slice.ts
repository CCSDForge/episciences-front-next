import { createSlice } from '@reduxjs/toolkit';
import { IAuthorState } from './author.type';
import { authorApi } from './author.query';

const initialState: IAuthorState = {
  authors: {
    data: [],
    totalItems: 0,
  },
};

export const authorSlice = createSlice({
  name: 'author',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addMatcher(authorApi.endpoints.fetchAuthors.matchFulfilled, (state, { payload }) => {
      state.authors = payload;
    });
  },
});

export default authorSlice.reducer;
