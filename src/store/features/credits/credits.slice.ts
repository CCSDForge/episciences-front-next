import { createSlice } from '@reduxjs/toolkit';

import { creditsApi } from './credits.query';
import { ICreditsState } from './credits.type';

const creditsSlice = createSlice({
  name: 'credits',
  initialState: {} as ICreditsState,
  reducers: {},
  extraReducers: builder => {
    builder.addMatcher(
      creditsApi.endpoints.fetchCreditsPage.matchFulfilled,
      (state, { payload }) => {
        state.credits = payload;
      }
    );
  },
});

export default creditsSlice.reducer;
