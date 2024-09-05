import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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

export default appSlice.reducer;
