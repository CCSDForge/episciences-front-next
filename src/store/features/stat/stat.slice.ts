import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import { IStat } from '../../../types/stat'
import { statApi } from './stat.query'
import { IStatState } from './stat.type'

const statSlice = createSlice({
  name: 'stat',
  initialState: {
    stats: {
      data: [],
      totalItems: 0
    },
  } as IStatState,
  reducers: {
    setLastStat(state, action: PayloadAction<IStat>) {
      state.lastStat = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      statApi.endpoints.fetchStats.matchFulfilled,
      (state, { payload }) => {
        state.stats = payload
      },
    )
  }
})

export const { setLastStat } = statSlice.actions

export default statSlice.reducer 