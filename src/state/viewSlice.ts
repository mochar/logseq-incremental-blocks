import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from './store';
import { BlockEntity } from '@logseq/libs/dist/LSPlugin.user';

export enum ViewType { main, learn, ib, medx, insert }

export interface BlockViewData {
  block: BlockEntity
}
export type InsertViewData = BlockViewData;

export interface SlotViewData extends BlockViewData {
  slotId: string
}
export type IbViewData = SlotViewData;

interface View {
  type: ViewType | null,
  data?: SlotViewData | BlockViewData
}

const initialState: View = {
  type: null
}

const viewSlice = createSlice({
  name: 'view',
  initialState,
  reducers: {
    setView: (state, action: PayloadAction<View>) => {
      state.type = action.payload.type;
      state.data = action.payload.data;
    }
  }
});

export const { setView } = viewSlice.actions;

export interface ViewRequest {
  viewType: ViewType | null,
  blockUuid?: string
  slotId?: string,
  medArgs?: string
}

export const toggleView = (request: ViewRequest) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    if (request.viewType == null || state.view.type == request.viewType) {
      dispatch(setView({ type: null }));
      logseq.hideMainUI();
    } else if (request.viewType == ViewType.main) {
      if (state.learn.learning) {
        dispatch(setView({ type: ViewType.learn }));
      } else {
        dispatch(setView({ type: ViewType.main }));
      }
      logseq.showMainUI();
    } else if (request.viewType == ViewType.learn) {
      dispatch(setView({ type: ViewType.learn }));
      logseq.showMainUI();
    } else if (request.viewType == ViewType.ib) {
      if (!request.blockUuid || !request.slotId) return;
      // Don't show when currently learning
      if (state.learn.learning && request.blockUuid == state.learn.current?.ib.uuid) {
        logseq.UI.showMsg('Stop learning to update incremental blocks')
        return;
      }
      const block = await logseq.Editor.getBlock(request.blockUuid);
      if (block) {
        const data: SlotViewData = { block, slotId: request.slotId };
        dispatch(setView({ type: ViewType.ib, data }))
        logseq.showMainUI();
      } else {
        logseq.UI.showMsg('Block not found.')
      }
    } else if (request.viewType == ViewType.medx) {
      dispatch(setView({ type: ViewType.medx }));
      logseq.showMainUI();
    } else if (request.viewType == ViewType.insert) {
      if (!request.blockUuid) return;
      const block = await logseq.Editor.getBlock(request.blockUuid);
      if (block) {
        const data: BlockViewData = { block };
        dispatch(setView({ type: ViewType.insert, data }))
        logseq.showMainUI();
      } else {
        logseq.UI.showMsg('Block not found.')
      }
    }
  }
}

export default viewSlice.reducer;
