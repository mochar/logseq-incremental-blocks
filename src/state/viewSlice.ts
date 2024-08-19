import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from './store';
import { GLOBALS } from '../globals';
import { BlockEntity } from '@logseq/libs/dist/LSPlugin.user';
import MedxArgs from '../medx/args';

export enum ViewType { main, ib, medx, insert }

export interface BlockViewData {
  block: BlockEntity
}
export type InsertViewData = BlockViewData;

export interface SlotViewData extends BlockViewData {
  slotId: string
}
export type IbViewData = SlotViewData;

export interface MedxViewData extends SlotViewData {
  medArgs: MedxArgs
}

interface View {
  type: ViewType | null,
  data?: SlotViewData | BlockViewData | MedxViewData
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
      dispatch(setView({ type: ViewType.main }));
      logseq.showMainUI();
    } else if (request.viewType == ViewType.ib) {
      if (!request.blockUuid || !request.slotId) return;
      // Don't show when currently learning
      if (GLOBALS.learning) {
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
      if (!request.blockUuid || !request.slotId || !request.medArgs) return;
      const args = MedxArgs.parse(request.medArgs.split(','));
      if (args == null) {
        logseq.UI.showMsg('Invalid media args');
        return;
      }
      const block = await logseq.Editor.getBlock(request.blockUuid);
      if (block) {
        const data: MedxViewData = { block, slotId: request.slotId, medArgs: args };
        dispatch(setView({ type: ViewType.medx, data }))
        logseq.showMainUI();
      } else {
        logseq.UI.showMsg('Block not found.')
      }
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
