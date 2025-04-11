import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

import { IJournal } from '@/types/journal'
import { IJournalState } from './journal.type'

const journalSlice = createSlice({
  name: 'journal',
  initialState: {} as IJournalState,
  reducers: {
    setCurrentJournal(state, action: PayloadAction<IJournal>) {
      state.currentJournal = action.payload;
    },
  }
})

export const { setCurrentJournal } = journalSlice.actions

export default journalSlice.reducer 