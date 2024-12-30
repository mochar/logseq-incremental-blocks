import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../state/store";
import Beta from "../algorithm/beta";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import { BlockEntity, EntityID, PageIdentity } from "@logseq/libs/dist/LSPlugin.user";
import { BetaParams } from "../types";
import { Media, MediaFragment, parseFragmentProperties, parseSourceProperties } from "./media";
import { ibFromProperties } from "../ib";

export interface MediaAttrs {
  loop: boolean,
  rate: number,
  volume: number,
}

export interface Extract {
  start: number,
  end: number,
  text?: string,
  index?: number
}

export interface MedxExtract {
  block: BlockEntity,
  medFrag: MediaFragment,
}

export interface FragmentData {
  fragment: MediaFragment,
  slotId: string,
  blockUuid: string,
  betaParams: BetaParams,
  interval: number,
}

interface MedxState {
  media: Media,
  // At any point, a fragment may be active
  activeFragmentData: FragmentData | null,
  selectedSubRange: number[] | null,
  selectionExtract: Extract | null,
  follow: boolean,
  time?: number,
  duration?: number,
  selectRange: number[],
  regionRange: number[],
  highlight: number[] | null,
  mediaAttrs: MediaAttrs,
  note: string,
  betaParams: BetaParams,
  interval: number,
}

const initialState: MedxState = {
  media: null,
  activeFragmentData: null,
  follow: false,
  selectRange: [0, 0],
  regionRange: [0, 0],
  highlight: null,
  mediaAttrs: { volume: 1, rate: 1, loop: false },
  note: '',
  betaParams: {a: 1, b: 2},
  interval: initialIntervalFromMean(0.5),
  selectedSubRange: null,
  selectionExtract: null,
}

const medxSlice = createSlice({
  name: 'medx',
  initialState,
  reducers: {
    mediaSelected(state, action: PayloadAction<Media | null>) {
      state.media = action.payload;
    },
    reset(state) {
      state.betaParams = state.activeFragmentData?.betaParams ?? {a:1, b:1};
      const beta = Beta.fromParams(state.betaParams);
      state.interval = initialIntervalFromMean(beta.mean);
      state.note = '';
      state.selectedSubRange = null;
      state.selectionExtract = null;
    },
    fragmentSelected(state, action: PayloadAction<FragmentData | null>) {
      state.activeFragmentData = action.payload;
    },
    durationRetrieved(state, action: PayloadAction<number>) {
      if (state.media === null) return;
      state.duration = action.payload;
      state.regionRange = [0, action.payload];
      const start = state.media.source.start ?? 0;
      const end = state.media.source.end ?? action.payload;
      state.selectRange = [start, end];
    },
    playerProgressed(state, action: PayloadAction<number>) {
      state.time = action.payload;
    },
    toggleFollow(state, action: PayloadAction<boolean>) {
      state.follow = action.payload;
    },
    selectionChanged(state, action: PayloadAction<number[]>) {
      state.selectRange = action.payload;
      if (state.regionRange[0] > state.selectRange[0]) {
        state.regionRange[0] = state.selectRange[0];
      } else if (state.regionRange[1] < state.selectRange[1]) {
        state.regionRange[1] = state.selectRange[1];
      }
      state.selectedSubRange = null;
    },
    regionChanged(state, action: PayloadAction<number[]>) {
      state.regionRange = action.payload;
    },
  }
});

export const { selectionChanged, toggleFollow, playerProgressed, durationRetrieved, regionChanged } = medxSlice.actions;

// Actions

export const selectMedia = (pageId: PageIdentity | EntityID) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const page = await logseq.Editor.getPage(pageId);
    console.log(page);
    if (!page) {
      logseq.UI.showMsg('Media page not found', 'error');
      return;
    }
    const source = parseSourceProperties(page.properties);
    if (source === null) {
      logseq.UI.showMsg('Media page does not contain required properties', 'error');
      return;
    }
    const media: Media = { pageUuid: page.uuid, source };
    dispatch(medxSlice.actions.reset());
    dispatch(medxSlice.actions.mediaSelected(media));
  }
}

interface ISelectMedia {
  slotId: string,
  blockUuid: string
}

export const selectFragmentBlock = (selection: ISelectMedia) => {
  return async (dispatch: AppDispatch, getState: () => RootState) : Promise<FragmentData | null> => {
    const state = getState();
    const active = state.medx.activeFragmentData;
    if (active && selection.slotId == active.slotId) return active;

    const props = await logseq.Editor.getBlockProperties(selection.blockUuid);
    if (!props) {
      logseq.UI.showMsg('Block not found', 'error');
      return null;
    }

    const fragment = parseFragmentProperties(props);
    if (fragment === null) {
      logseq.UI.showMsg('Block does not contain necessary properties', 'error');
      return null;
    }
    
    const ib = ibFromProperties(selection.blockUuid, props);
    if (ib === null) {
      logseq.UI.showMsg('Ib properties not found', 'warning');
    }

    const beta = Beta.fromParams(ib ? ib.betaParams : {a:1, b:1});
    const data: FragmentData = {
      fragment,
      slotId: selection.slotId,
      blockUuid: selection.blockUuid,
      betaParams: beta.params,
      interval: initialIntervalFromMean(beta.mean)
    };
    
    dispatch(medxSlice.actions.fragmentSelected(data));
    return data;
  }
}

export default medxSlice.reducer;

// Selectors
