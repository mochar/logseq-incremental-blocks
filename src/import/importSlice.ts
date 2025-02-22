import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { AppDispatch, RootState } from "../state/store";
import { ImportFormat, importFormats } from "./types";
import { BetaParams } from "../types";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import { betaFromMean } from "../algorithm/priority";
import { assetToPath } from "../utils/logseq";

interface ImportState {
  busy: boolean,
  format: ImportFormat,
  betaParams: BetaParams,
  interval: number
}

const initialState: ImportState = {
  busy: false,
  format: importFormats[0],
  betaParams: {a: 1, b: 1},
  interval: initialIntervalFromMean(.5)
}

const importSlice = createSlice({
  name: 'import',
  initialState,
  reducers: {
    gotBusy(state, action: PayloadAction<boolean>) {
      state.busy = action.payload;
    },
    formatSelected(state, action: PayloadAction<ImportFormat>) {
      state.format = action.payload;
    },
    priorityChanged(state, action: PayloadAction<number>) {
      state.betaParams = betaFromMean(action.payload).params;
      state.interval = initialIntervalFromMean(action.payload);
    },
    intervalChanged(state, action: PayloadAction<number>) {
      state.interval = action.payload;
    }
  }
});

export const { formatSelected, priorityChanged, intervalChanged } = importSlice.actions;

export const importHtml = (title: string, html: string) => {
  return async (dispatch: AppDispatch, getState: () => RootState) : Promise<boolean> => {
    const state = getState();
    if (state.import.busy) return;
    dispatch(importSlice.actions.gotBusy(true));

    let page = await logseq.Editor.getPage(title);
    if (page) {
      logseq.UI.showMsg('Page already exists with given title', 'error');
      dispatch(importSlice.actions.gotBusy(false));
      return false;
    }
    const storage = logseq.Assets.makeSandboxStorage();
    const filename = `${title}.html`;
    if (await storage.hasItem(filename)) {
      logseq.UI.showMsg('Asset already exists with given title', 'error');
      dispatch(importSlice.actions.gotBusy(false));
      return false;
    }

    await storage.setItem(filename, html);
    await logseq.Editor.createPage(title, { 'webx-title': title }, { redirect: true });
    
    dispatch(importSlice.actions.gotBusy(false));
    return true;
  }
}

export default importSlice.reducer;

