import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../state/store";
import { getSubtitles, getVideoDetails, VideoDetails } from 'youtube-caption-extractor';
import Beta from "../algorithm/beta";
import MediaFragment from "./MediaFragment";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import IncrementalBlock from "../IncrementalBlock";

export interface MedxData {
  medFrag: MediaFragment,
  slotId: string,
  block: BlockEntity,
  beta: Beta,
  interval: number,
  ytData?: VideoDetails
}

interface MedxState {
  active: MedxData | null,
  language: string,
  follow: boolean,
  time?: number,
  duration?: number,
  selectRange: number[],
  regionRange: number[]
}

const initialState: MedxState = {
  active: null,
  language: 'en',
  follow: false,
  selectRange: [0, 0],
  regionRange: [0, 0]
}

const medxSlice = createSlice({
  name: 'medx',
  initialState,
  reducers: {
    medSelected(state, action: PayloadAction<MedxData | null>) {
      state.active = action.payload;
      
    },
    ytDataLoaded(state, action: PayloadAction<VideoDetails>) {
      if (state.active) state.active.ytData = action.payload;
    },
    durationRetrieved(state, action: PayloadAction<number>) {
      const medFrag = state.active?.medFrag;
      if (medFrag) {
        state.duration = action.payload;
        state.regionRange = [0, action.payload];
        const start = medFrag.start ?? 0;
        const end = medFrag.end ?? action.payload;
        state.selectRange = [start, end];
      }
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
    },
    regionChanged(state, action: PayloadAction<number[]>) {
      state.regionRange = action.payload;
    }
  }
});

export const { playerProgressed, toggleFollow, selectionChanged, regionChanged, durationRetrieved } = medxSlice.actions;

// Actions

interface ISelectMedia {
  medFrag: MediaFragment,
  slotId: string,
  blockUuid: string
}

export const selectMedia = (selection: ISelectMedia | null) => {
  return async (dispatch: AppDispatch, getState: () => RootState) : Promise<MedxData | null> => {
    let medxData: MedxData | null = null;
    if (selection) {
      const block = await logseq.Editor.getBlock(selection.blockUuid);
      if (block) {
        const ib = IncrementalBlock.fromBlock(block);
        medxData = {
          ...selection,
          block,
          beta: ib.beta ?? new Beta(1, 1),
          interval: initialIntervalFromMean(.5)
        }
      } else {
        logseq.UI.showMsg('Block not found', 'warning');
      }
    }
    dispatch(medxSlice.actions.medSelected(medxData));

    return medxData;
  }
}

export const getYoutubeData = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const { medx } = getState();
    if (medx.active?.medFrag.format != 'youtube') return;
    try {
      const lang = medx.language;
      const videoID = medx.active.medFrag.url;
      const videoDetails = await getVideoDetails({ videoID, lang });
      dispatch(medxSlice.actions.ytDataLoaded(videoDetails));
    } catch (e) {
      logseq.UI.showMsg('Error fetching video details:' + e, 'warning');
    }
  }
}

export default medxSlice.reducer;

// Selectors
