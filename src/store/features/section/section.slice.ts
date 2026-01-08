import { createSlice } from '@reduxjs/toolkit';

import { sectionApi } from './section.query';
import { ISectionState } from './section.type';

const sectionSlice = createSlice({
  name: 'section',
  initialState: {
    sections: {
      data: [],
      totalItems: 0,
    },
  } as ISectionState,
  reducers: {},
  extraReducers: builder => {
    builder.addMatcher(sectionApi.endpoints.fetchSections.matchFulfilled, (state, { payload }) => {
      state.sections = payload;
    });
  },
});

export default sectionSlice.reducer;
