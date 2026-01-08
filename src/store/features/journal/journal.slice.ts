import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { IJournal } from '@/types/journal';
import { IJournalState } from './journal.type';

// Étendre l'état pour inclure l'endpoint API et la configuration dynamique
interface ExtendedJournalState extends IJournalState {
  apiEndpoint?: string;
  config?: Record<string, string>; // Stocke les variables comme NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR
}

const initialState: ExtendedJournalState = {
  journals: [],
};

const journalSlice = createSlice({
  name: 'journal',
  initialState,
  reducers: {
    setCurrentJournal(state, action: PayloadAction<IJournal>) {
      state.currentJournal = action.payload;
    },
    setApiEndpoint(state, action: PayloadAction<string>) {
      state.apiEndpoint = action.payload;
    },
    setJournalConfig(state, action: PayloadAction<Record<string, string>>) {
      state.config = action.payload;
    },
  },
});

export const { setCurrentJournal, setApiEndpoint, setJournalConfig } = journalSlice.actions;

// Sélecteurs
export const selectApiEndpoint = (state: { journalReducer: ExtendedJournalState }) =>
  state.journalReducer.apiEndpoint;
export const selectJournalConfig = (state: { journalReducer: ExtendedJournalState }) =>
  state.journalReducer.config;

// Helper pour récupérer une variable de config avec priorité :
// 1. Config dynamique (Redux)
// 2. Variable d'env globale (process.env)
export const selectConfigValue =
  (key: string) => (state: { journalReducer: ExtendedJournalState }) => {
    return state.journalReducer.config?.[key] || process.env[key];
  };

export default journalSlice.reducer;
