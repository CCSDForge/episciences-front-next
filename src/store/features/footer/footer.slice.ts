import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { IFooterState } from './footer.type';

const footerSlice = createSlice({
  name: 'footer',
  initialState: {
    enabled: true,
  } as IFooterState,
  reducers: {
    setFooterVisibility(state, action: PayloadAction<boolean>) {
      state.enabled = action.payload;
    },
  },
});

export const { setFooterVisibility } = footerSlice.actions;

export default footerSlice.reducer;
