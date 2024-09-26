import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./store";
import { getUserRefs } from "../learn/learnSlice";

declare type ThemeMode = 'light' | 'dark';

interface IAppState {
  themeMode: ThemeMode;
} 

const initialState: IAppState = {
  themeMode: 'light'
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    themeModeChanged: (state, action: PayloadAction<ThemeMode>) => {
      state.themeMode = action.payload;
    }
  }
});

export const { themeModeChanged } = appSlice.actions;

export const handleSettingsChanged = createAsyncThunk<void, { old: any, new: any }, { state: RootState }>(
  'app/handleSettingsChanged', 
  async (settings, { getState, dispatch }) => {
    console.log(settings);
    if (settings.old.subsetQueries != settings.new.subsetQueries) {
      //@ts-ignore
      dispatch(getUserRefs());
    }
  }
);

export default appSlice.reducer;

