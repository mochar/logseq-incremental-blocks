import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from './store';
import { BlockEntity } from '@logseq/libs/dist/LSPlugin.user';
import { updateVisiblity } from '../utils/logseq';

export enum MainView { main }
export enum PopoverView { learn, ib, insert }
export enum ModalView { ibActions, import }
export enum EditorView { medx, web }

export interface BlockViewData {
  block: BlockEntity
}
export type InsertViewData = BlockViewData;

export interface SlotViewData extends BlockViewData {
  slotId: string
}
export type IbViewData = SlotViewData;

interface ViewData {
  view: MainView | PopoverView | ModalView | EditorView,
  data?: SlotViewData | BlockViewData
}

interface ViewState {
  main: ViewData | null,
  popover: ViewData | null,
  modal: ViewData | null,
  editor: ViewData | null
}

const initialState: ViewState = {
  main: null,
  popover: null,
  modal: null,
  editor: null
}

const viewSlice = createSlice({
  name: 'view',
  initialState,
  reducers: {
    setMainView: (state, action: PayloadAction<ViewData | null>) => {
      state.main = action.payload;
    },
    setPopoverView: (state, action: PayloadAction<ViewData | null>) => {
      state.popover = action.payload;
    },
    setModalView: (state, action: PayloadAction<ViewData | null>) => {
      state.modal = action.payload;
    },
    setEditorView: (state, action: PayloadAction<ViewData | null>) => {
      state.editor = action.payload;
    },
  }
});

export const { setMainView, setPopoverView, setModalView, setEditorView } = viewSlice.actions;

export interface ViewRequest {
  view: MainView | PopoverView | null,
  blockUuid?: string
  slotId?: string,
  medArgs?: string
}

// TODO: Now that switching to provideUI, can prob get rid of show/hideMainUI logic

export const togglePopoverView = (request: ViewRequest) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    if (request.view == null || state.view.popover?.view == request.view) {
      dispatch(setPopoverView(null));
    } else if (request.view == PopoverView.learn) {
      dispatch(setPopoverView({ view: PopoverView.learn }));
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
      } else {
        logseq.UI.showMsg('Block not found.')
      }
    } else if (request.view == PopoverView.insert) {
      if (!request.blockUuid) return;
      const block = await logseq.Editor.getBlock(request.blockUuid);
      if (block) {
        const data: BlockViewData = { block };
        dispatch(setPopoverView({ view: PopoverView.insert, data }))
      } else {
        logseq.UI.showMsg('Block not found.')
      }
    }
    updateVisiblity(getState());
  }
}

export const toggleMainView = (request: ViewRequest) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    if (request.view == null || state.view.main?.view == request.view) {
      dispatch(setMainView(null));
    } else if (request.view == MainView.main) {
      dispatch(setMainView({ view: MainView.main }));
      if (state.view.popover) dispatch(setPopoverView(null));
    }
    updateVisiblity(getState());
  }
}

export default viewSlice.reducer;
