import { createSlice } from '@reduxjs/toolkit';

import { boardApi } from './board.query';
import { IBoardState } from './board.type';

const boardSlice = createSlice({
  name: 'board',
  initialState: {
    pages: [],
    members: [],
  } as IBoardState,
  reducers: {},
  extraReducers: builder => {
    (builder.addMatcher(boardApi.endpoints.fetchBoardPages.matchFulfilled, (state, { payload }) => {
      state.pages = payload;
    }),
      builder.addMatcher(
        boardApi.endpoints.fetchBoardMembers.matchFulfilled,
        (state, { payload }) => {
          state.members = payload;
        }
      ));
  },
});

export default boardSlice.reducer;
