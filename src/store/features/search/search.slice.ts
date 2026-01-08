import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { searchApi } from './search.query';
import { ISearchState } from './search.type';

const searchSlice = createSlice({
  name: 'search',
  initialState: {
    results: {
      data: [],
      totalItems: 0,
    },
  } as ISearchState,
  reducers: {
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
  },
  extraReducers: builder => {
    builder.addMatcher(
      searchApi.endpoints.fetchSearchResults.matchFulfilled,
      (state, { payload }) => {
        state.results = payload;
      }
    );
  },
});

export const { setSearch } = searchSlice.actions;

export default searchSlice.reducer;
