import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { forAuthorApi } from './forAuthor.query';
import { IForAuthorState } from './forAuthor.type';
import { IPage } from '@/types/page';

const forAuthorSlice = createSlice({
  name: 'forAuthor',
  initialState: {} as IForAuthorState,
  reducers: {},
  extraReducers: builder => {
    builder.addMatcher(
      forAuthorApi.endpoints.fetchEditorialWorkflowPage.matchFulfilled,
      (state, { payload }: PayloadAction<IPage | undefined>) => {
        state.editorialWorkflow = payload;
      }
    );
    builder.addMatcher(
      forAuthorApi.endpoints.fetchEthicalCharterPage.matchFulfilled,
      (state, { payload }: PayloadAction<IPage | undefined>) => {
        state.ethicalCharter = payload;
      }
    );
    builder.addMatcher(
      forAuthorApi.endpoints.fetchPrepareSubmissionPage.matchFulfilled,
      (state, { payload }: PayloadAction<IPage | undefined>) => {
        state.prepareSubmission = payload;
      }
    );
  },
});

export default forAuthorSlice.reducer;
