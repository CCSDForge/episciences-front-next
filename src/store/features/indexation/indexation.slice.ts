import { createSlice } from '@reduxjs/toolkit'

import { indexationApi } from './indexation.query'
import { IIndexationState } from './indexation.type'

const indexationSlice = createSlice({
  name: 'indexation',
  initialState: {} as IIndexationState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addMatcher(
      indexationApi.endpoints.fetchIndexationPage.matchFulfilled,
      (state, { payload }) => {
        state.indexation = payload
      },
    )
  }
})

export default indexationSlice.reducer 