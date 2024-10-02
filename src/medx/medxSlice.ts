import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../state/store";
import { getSubtitles, getVideoDetails, VideoDetails } from 'youtube-caption-extractor';
import Beta from "../algorithm/beta";
import MediaFragment from "./MediaFragment";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import IncrementalBlock from "../IncrementalBlock";

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

export interface MedxData {
  medFrag: MediaFragment,
  slotId: string,
  block: BlockEntity,
  beta: Beta,
  interval: number,
}

interface MedxState {
  active: MedxData | null,
  extracts?: MedxExtract[],
  subs?: Extract[],
  selectedSubRange: number[] | null,
  chapters?: Extract[],
  selectionExtract: Extract | null,
  language: string,
  follow: boolean,
  time?: number,
  duration?: number,
  selectRange: number[],
  regionRange: number[],
  highlight: number[] | null,
  volume: number,
  rate: number,
  loop: boolean,
  note: string,
  beta: Beta,
  interval: number,
  // Should actions and views on extracts, subs, chapters be restricted
  // to the selection range.
  ranged: boolean
}

const initialState: MedxState = {
  active: null,
  language: 'en',
  follow: false,
  selectRange: [0, 0],
  regionRange: [0, 0],
  highlight: null,
  volume: 1,
  rate: 1,
  loop: false,
  note: '',
  beta: new Beta(1, 1),
  interval: initialIntervalFromMean(0.5),
  selectedSubRange: null,
  selectionExtract: null,
  ranged: true
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
        state.extracts = extracts;
      }
      state.active = medxData;
    },
    ytDataLoaded(state, action: PayloadAction<VideoDetails>) {
      if (!state.active) return;
      state.subs = action.payload.subtitles
        .map((sub, index) => {
          const start = parseFloat(sub.start);
          return {
            start,
            end: start + parseFloat(sub.dur),
            text: sub.text,
            index
          }
          });
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
    },
    languageSelected(state, action: PayloadAction<string>) {
      state.language = action.payload;
    },
    fragmentSelected(state, action: PayloadAction<{ range: number[], note?: string, beta?: Beta, interval?: number }>) {
      state.selectRange = action.payload.range;
      state.note = action.payload.note ?? '';
      if (state.active) {
        state.active.beta = action.payload.beta ?? state.active.beta;
        state.active.interval = action.payload.interval ?? state.active.interval;
      }
    },
    subRangeSelected(state, action: PayloadAction<number[] | null>) {
      const range = action.payload;
      state.selectedSubRange = range;
      if (range == null) {
        state.selectionExtract = null;
      } else {
        const subs = state.subs!.slice(range[0], range[1]);
        state.selectionExtract = {
          start: subs[0].start,
          end: subs[subs.length-1].end,
          text: subs.map(s => s.text ?? '').join('')
        }
      }
    },
    rangedToggled(state, action: PayloadAction<boolean | undefined>) {
      state.ranged = action.payload == undefined ? !state.ranged : action.payload;
    }
  }
});

export const { playerProgressed, toggleFollow, selectionChanged, regionChanged, durationRetrieved, rangeHighlighted, languageSelected, fragmentSelected, subRangeSelected, rangedToggled } = medxSlice.actions;

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

interface ExtractData {
  content: string,
  properties: {}
}

export const genExtractData = ({ extract }: { extract?: Extract }) => {
  return (dispatch: AppDispatch, getState: () => RootState) : ExtractData => {
    const { medx } = getState();
    const data = medx.active!;
    const range = extract ? [extract.start, extract.end] : medx.selectRange;
    const medFrag = new MediaFragment({
      flag: ':medx_ref',
      url: data.medFrag.url,
      format: data.medFrag.format,
      volume: medx.volume,
      rate: medx.rate,
      loop: medx.loop,
      start: range[0],
      end: range[1]
    });
    
    const note = extract ? extract.text ?? '' : medx.note;
    const content = `${note}\n${medFrag.render()} \n{{renderer :ib}}`;
    const due = new Date();
    due.setDate(due.getDate() + medx.interval);
    const properties = {
      'ib-reps': 0,
      'ib-a': medx.beta.a,
      'ib-b': medx.beta.b,
      'ib-due': due.getTime(),
      'ib-interval': medx.interval
    };
    
    return { content, properties };
  }
}

export const extractSubs = (withinSelection: boolean = false) => {
  return async (dispatch: AppDispatch, getState: () => RootState) : Promise<BlockEntity[] | null> => {
    const { medx } = getState();
    let extracts = selectRangedSubs(getState());
    if (extracts == null) return null;
    if (medx.selectedSubRange) {
      const range = medx.selectedSubRange;
      extracts = extracts.filter((_, i) => i >= range[0] && i <= range[1]);
    }
    const extractData = extracts.map(extract => dispatch(genExtractData({ extract })));
    const blocks = await logseq.Editor.insertBatchBlock(medx.active!.block.uuid, extractData);
    logseq.Editor.exitEditingMode();
    return blocks;
  }
}

export default medxSlice.reducer;

// Selectors

export function isExtractInRange(extract: Extract, range: number[]) : boolean {
  return (extract.end >= range[0] && extract.end <= range[1]) ||
    (extract.start >= range[0] && extract.start <= range[1]);
}

export const selectRangedSubs = createSelector.withTypes<RootState>()(
  [
    state => state.medx.subs,
    state => state.medx.ranged,
    state => state.medx.selectRange
  ],
  (subs, ranged, selection) => {
    if (subs == null || subs.length == 0 || !ranged) return subs;
    return subs.filter(sub => isExtractInRange(sub, selection))
  }
);
