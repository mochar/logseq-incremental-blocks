import { configureStore } from '@reduxjs/toolkit';
import appReducer from './appSlice';
import viewReducer from './viewSlice';
import ankiReducer from '../anki/ankiSlice';
import learnReducer from '../learn/learnSlice';
import mainReducer from '../main/mainSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    view: viewReducer,
    learn: learnReducer,
    anki: ankiReducer,
    main: mainReducer
  }
})

// Infer the type of `store`
export type AppStore = typeof store
// Infer the `AppDispatch` type from the store itself
export type AppDispatch = typeof store.dispatch
// Same for the `RootState` type
export type RootState = ReturnType<typeof store.getState>
