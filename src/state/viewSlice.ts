import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from './store';
import { BlockEntity } from '@logseq/libs/dist/LSPlugin.user';

export enum MainView { main, medx }
export enum PopoverView { learn, ib, insert }

export interface BlockViewData {
  block: BlockEntity
}
export type InsertViewData = BlockViewData;

export interface SlotViewData extends BlockViewData {
  slotId: string
}
export type IbViewData = SlotViewData;

interface ViewData {
  view: MainView | PopoverView,
  data?: SlotViewData | BlockViewData
}

interface ViewState {
  main: ViewData,
  popover: ViewData
}

const initialState: ViewState = {
  main: null,
  popover: null
}

const viewSlice = createSlice({
  name: 'view',
  initialState,
  reducers: {
    setMainView: (state, action: PayloadAction<ViewData | null>) => {
      state.main = action.payload;
      if (state.main == null && state.popover == null) logseq.hideMainUI();
    },
    setPopoverView: (state, action: PayloadAction<ViewData | null>) => {
      state.popover = action.payload;
      if (state.main == null && state.popover == null) logseq.hideMainUI();
    }
  }
});

export const { setMainView, setPopoverView } = viewSlice.actions;

export interface ViewRequest {
  view: MainView | PopoverView | null,
  blockUuid?: string
  slotId?: string,
  medArgs?: string
}

export const togglePopoverView = (request: ViewRequest) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    if (request.view == null || state.view.popover?.view == request.view) {
      dispatch(setPopoverView(null));
      if (state.main == null) logseq.hideMainUI();
    } else if (request.view == PopoverView.learn) {
      dispatch(setPopoverView({ view: PopoverView.learn }));
      logseq.showMainUI();
    } else if (request.view == PopoverView.ib) {
      if (!request.blockUuid || !request.slotId) return;
      // Don't show when currently learning
      if (state.learn.learning && request.blockUuid == state.learn.current?.ib.uuid) {
        logseq.UI.showMsg('Stop learning to update incremental blocks')
        return;
      }
      const block = await logseq.Editor.getBlock(request.blockUuid);
      if (block) {
        const data: SlotViewData = { block, slotId: request.slotId };
        dispatch(setPopoverView({ view: PopoverView.ib, data }))
        logseq.showMainUI();
      } else {
        logseq.UI.showMsg('Block not found.')
      }
    } else if (request.view == PopoverView.insert) {
      if (!request.blockUuid) return;
      const block = await logseq.Editor.getBlock(request.blockUuid);
      if (block) {
        const data: BlockViewData = { block };
        dispatch(setPopoverView({ view: PopoverView.insert, data }))
        logseq.showMainUI();
      } else {
        logseq.UI.showMsg('Block not found.')
      }
    }
  }
}

export const toggleMainView = (request: ViewRequest) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    if (request.view == null || state.view.main?.view == request.view) {
      dispatch(setMainView(null));
      if (state.popover == null) logseq.hideMainUI();
    } else if (request.view == MainView.main) {
      dispatch(setMainView({ view: MainView.main }));
      if (state.view.popover) dispatch(setPopoverView(null));
      logseq.showMainUI();
    } else if (request.view == MainView.medx) {
      dispatch(setMainView({ view: MainView.medx }));
      logseq.showMainUI();
    }
  }
}

export default viewSlice.reducer;
