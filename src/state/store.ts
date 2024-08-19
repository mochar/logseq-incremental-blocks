import { configureStore } from '@reduxjs/toolkit';
import type { Action } from '@reduxjs/toolkit';
import viewReducer from './viewSlice';

export const store = configureStore({
  reducer: {
    view: viewReducer
  }
})

// Infer the type of `store`
export type AppStore = typeof store
// Infer the `AppDispatch` type from the store itself
export type AppDispatch = typeof store.dispatch
// Same for the `RootState` type
export type RootState = ReturnType<typeof store.getState>
