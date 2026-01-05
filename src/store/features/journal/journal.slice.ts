import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import { IJournal } from '@/types/journal'
import { IJournalState } from './journal.type'

// Étendre l'état pour inclure l'endpoint API
interface ExtendedJournalState extends IJournalState {
  apiEndpoint?: string;
}

const initialState: ExtendedJournalState = {
  journals: []
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
  }
})

export const { setCurrentJournal, setApiEndpoint } = journalSlice.actions

// Sélecteur pour récupérer l'endpoint API
export const selectApiEndpoint = (state: { journal: ExtendedJournalState }) => state.journal.apiEndpoint;

export default journalSlice.reducer 