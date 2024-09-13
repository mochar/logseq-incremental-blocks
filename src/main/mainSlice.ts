import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { refreshDueIbs } from "../learn/learnSlice";

export declare type MainWindowTab = 'queue' | 'anki' | 'calendar';

interface MainState {
  activeTab: MainWindowTab,
  busy: boolean
}

const initialState: MainState = {
  activeTab: 'queue',
  busy: false
}

const mainSlice = createSlice({
  name: 'main',
  initialState,
  reducers: {
    tabSelected(state, action: PayloadAction<MainWindowTab>) {
      state.activeTab = action.payload;
    },
    gotBusy(state, action: PayloadAction<boolean>) {
      state.busy = action.payload;
    }
  },
  extraReducers: builder => {
    builder
      .addCase(refreshDueIbs.pending, (state, action) => {
        state.busy = true;
      })
      .addCase(refreshDueIbs.fulfilled, (state, action) => {
        state.busy = false;
      })
      .addCase(refreshDueIbs.rejected, (state, action) => {
        state.busy = false;
      })
  }
});

export const { tabSelected, gotBusy } = mainSlice.actions;

export default mainSlice.reducer;