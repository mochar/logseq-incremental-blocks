import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../state/store";
import { getSubtitles, getVideoDetails, VideoDetails } from 'youtube-caption-extractor';
import Beta from "../algorithm/beta";
import MediaFragment from "./MediaFragment";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import IncrementalBlock from "../IncrementalBlock";

export interface MedxExtract {
  block: BlockEntity,
  medFrag: MediaFragment,
}

export interface MedxData {
  medFrag: MediaFragment,
  slotId: string,
  block: BlockEntity,
  beta: Beta,
  interval: number,
  extracts?: MedxExtract[],
  ytData?: VideoDetails
}

interface MedxState {
  active: MedxData | null,
  language: string,
  follow: boolean,
  time?: number,
  duration?: number,
  selectRange: number[],
  regionRange: number[],
  highlight: number[] | null
}

const initialState: MedxState = {
  active: null,
  language: 'en',
  follow: false,
  selectRange: [0, 0],
  regionRange: [0, 0],
  highlight: null
}

const medxSlice = createSlice({
  name: 'medx',
  initialState,
  reducers: {
    medSelected(state, action: PayloadAction<MedxData | null>) {
      const medxData = action.payload;
      if (medxData?.block.children?.length) {
        const extracts: MedxExtract[] = [];
        for (let block of medxData.block.children) {
          block = block as BlockEntity
          if (!block.content) continue;
          const matches = block.content.match(/\{\{renderer\s*:medx[^\}]+\}\}/);
          if (matches == null || matches.length == 0) continue;
          const args = matches[0].replace('{{renderer ', '').replace('}}', '');
          const medFrag = MediaFragment.parse(args.split(', '));
          if (medFrag == null) continue;
          extracts.push({ block, medFrag });
        }
        medxData.extracts = extracts;
      }
      state.active = medxData;
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
    },
    rangeHighlighted(state, action: PayloadAction<number[] | null>) {
      state.highlight = action.payload;
    }
  }
});

export const { playerProgressed, toggleFollow, selectionChanged, regionChanged, durationRetrieved, rangeHighlighted } = medxSlice.actions;

// Actions

interface ISelectMedia {
  medFrag: MediaFragment,
  slotId: string,
  blockUuid: string
}

export const selectMedia = (selection: ISelectMedia | null) => {
  return async (dispatch: AppDispatch, getState: () => RootState) : Promise<MedxData | null> => {
    const state = getState();
    let medxData: MedxData | null = null;
    if (selection && selection.blockUuid != state.medx.active?.block.uuid) {
      const block = await logseq.Editor.getBlock(selection.blockUuid, { includeChildren: true });
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
