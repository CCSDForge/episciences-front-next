import { createSlice } from '@reduxjs/toolkit'

import { aboutApi } from './about.query'
import { IAboutState } from './about.type'

const aboutSlice = createSlice({
  name: 'about',
  initialState: {} as IAboutState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addMatcher(
      aboutApi.endpoints.fetchAboutPage.matchFulfilled,
      (state, { payload }) => {
        state.about = payload
      },
    )
  }
})

export default aboutSlice.reducer 