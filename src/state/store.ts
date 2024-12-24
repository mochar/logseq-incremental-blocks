import { configureStore } from '@reduxjs/toolkit';
import appReducer from './appSlice';
import viewReducer from './viewSlice';
import learnReducer from '../learn/learnSlice';
import mainReducer from '../main/mainSlice';
import medxReducer from '../medx/medxSlice';
import { listenerMiddleware } from './listenerMiddleware';

export const store = configureStore({
  reducer: {
    app: appReducer,
    view: viewReducer,
    learn: learnReducer,
    medx: medxReducer,
    main: mainReducer
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().prepend(listenerMiddleware.middleware)
})

// infer the type of `store`
export type AppStore = typeof store
// Infer the `AppDispatch` type from the store itself
export type AppDispatch = typeof store.dispatch
// Same for the `RootState` type
export type RootState = ReturnType<typeof store.getState>
