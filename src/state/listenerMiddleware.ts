// https://redux.js.org/usage/migrating-to-modern-redux#data-fetching-with-rtk-query
import { addListener, createListenerMiddleware, TypedAddListener, TypedStartListening } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from './store';

export const listenerMiddleware = createListenerMiddleware();

export const { startListening } = listenerMiddleware;

export type AppStartListening = TypedStartListening<RootState, AppDispatch>

export const startAppListening =
  listenerMiddleware.startListening as AppStartListening

export const addAppListener = addListener as TypedAddListener<
  RootState,
  AppDispatch
>
