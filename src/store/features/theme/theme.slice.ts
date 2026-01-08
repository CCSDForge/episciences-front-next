import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface IThemeState {
  theme: 'light' | 'dark';
}

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    theme: 'light',
  } as IThemeState,
  reducers: {
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload;
    },
  },
});

export const { setTheme } = themeSlice.actions;

export default themeSlice.reducer;
