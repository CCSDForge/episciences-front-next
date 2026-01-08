import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { AvailableLanguage, defaultLanguage } from '@/utils/i18n';

interface II18nState {
  language: AvailableLanguage;
}

const i18nSlice = createSlice({
  name: 'i18n',
  initialState: {
    language: defaultLanguage as AvailableLanguage,
  } as II18nState,
  reducers: {
    setLanguage(state, action: PayloadAction<AvailableLanguage>) {
      state.language = action.payload;
    },
  },
});

export const { setLanguage } = i18nSlice.actions;

export default i18nSlice.reducer;
