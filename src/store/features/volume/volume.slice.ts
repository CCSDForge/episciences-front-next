import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import { IVolume } from '@/types/volume'
import { volumeApi } from './volume.query'
import { IVolumeState } from './volume.type'

const volumeSlice = createSlice({
  name: 'volume',
  initialState: {
    volumes: {
      data: [],
      totalItems: 0
    },
  } as IVolumeState,
  reducers: {
    setLastVolume(state, action: PayloadAction<IVolume>) {
      state.lastVolume = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      volumeApi.endpoints.fetchVolumes.matchFulfilled,
      (state, { payload }) => {
        state.volumes = payload
      },
    )
  }
})

export const { setLastVolume } = volumeSlice.actions

export default volumeSlice.reducer 