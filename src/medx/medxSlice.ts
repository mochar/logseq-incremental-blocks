import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../state/store";
import { getSubtitles, getVideoDetails, VideoDetails } from 'youtube-caption-extractor';
import Beta from "../algorithm/beta";
import { initialIntervalFromMean } from "../algorithm/scheduling";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import IncrementalBlock from "../IncrementalBlock";
import { betaFromMean } from "../algorithm/priority";
import { BetaParams } from "../types";
import { MediaFragment, parseFragment, renderFragment } from "./MediaFragment";

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

export interface MedxData {
  medFrag: MediaFragment,
  slotId: string,
  block: BlockEntity,
  betaParams: BetaParams,
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
  mediaAttrs: MediaAttrs,
  note: string,
  betaParams: BetaParams,
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
  mediaAttrs: { volume: 1, rate: 1, loop: false },
  note: '',
  betaParams: {a: 1, b: 2},
  interval: initialIntervalFromMean(0.5),
  selectedSubRange: null,
  selectionExtract: null,
  ranged: true
}

function parseExtracts(block: BlockEntity) : MedxExtract[] {
  if (block.children?.length) {
    const extracts: MedxExtract[] = [];
    for (let childBlock of block.children) {
      childBlock = childBlock as BlockEntity
      if (!childBlock.content) continue;
      const matches = childBlock.content.match(/\{\{renderer\s*:medx[^\}]+\}\}/);
      if (matches == null || matches.length == 0) continue;
      const args = matches[0].replace('{{renderer ', '').replace('}}', '');
      const medFrag = parseFragment(args.split(', '));
      if (medFrag == null) continue;
      extracts.push({ block: childBlock, medFrag });
    }
    return extracts;
  }
  return [];
}

const medxSlice = createSlice({
  name: 'medx',
  initialState,
  reducers: {
    reset(state) {
      state.betaParams = state.active?.betaParams ?? {a:1, b:1};
      const beta = Beta.fromParams(state.betaParams);
      state.interval = initialIntervalFromMean(beta.mean);
      state.note = '';
      state.selectedSubRange = null;
      state.selectionExtract = null;
    },
    medSelected(state, action: PayloadAction<MedxData | null>) {
      const medxData = action.payload;
      if (medxData?.block) state.extracts = parseExtracts(medxData.block);
      state.active = medxData;
    },
    blockReloaded(state, action: PayloadAction<BlockEntity>) {
      if (!state.active) return;
      const block = action.payload;
      state.extracts = parseExtracts(block);
      state.active.block = block;
      const ib = IncrementalBlock.fromBlock(block);
      if (ib.beta) {
        state.active.betaParams = ib.beta.params;
        state.betaParams = ib.beta.params;
        state.interval = initialIntervalFromMean(ib.beta.mean);
      }
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
      console.log('selection changed', action.payload);
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
    rangeHighlighted(state, action: PayloadAction<number[] | null>) {
      state.highlight = action.payload;
    },
    languageSelected(state, action: PayloadAction<string>) {
      state.language = action.payload;
    },
    fragmentSelected(state, action: PayloadAction<{ range: number[], note?: string, betaParams?: BetaParams, interval?: number }>) {
      state.selectRange = action.payload.range;
      state.note = action.payload.note ?? '';
      if (state.active) {
        state.active.betaParams = action.payload.betaParams ?? state.active.betaParams;
        state.active.interval = action.payload.interval ?? state.active.interval;
      }
    },
    subRangeSelected(state, action: PayloadAction<number[] | null>) {
      const range = action.payload;
      state.selectedSubRange = range;
      if (range == null) {
        state.selectionExtract = null;
      } else {
        const subs = state.subs!.slice(range[0], range[1]+1);
        state.selectionExtract = {
          start: subs[0].start,
          end: subs[subs.length-1].end,
          text: subs.map(s => s.text ?? '').join('')
        }
        state.note = state.selectionExtract.text ?? '';
      }
    },
    rangedToggled(state, action: PayloadAction<boolean | undefined>) {
      state.ranged = action.payload == undefined ? !state.ranged : action.payload;
      if (state.ranged && state.selectedSubRange != null) {
        // TODO figure out the logic here, for now just set to null
        state.selectedSubRange = null;
      }
    },
    priorityChanged(state, action: PayloadAction<number>) {
      const mean = action.payload;
      const newBeta = betaFromMean(mean, { currentBeta: new Beta(state.betaParams.a, state.betaParams.b) });
      state.betaParams = newBeta.params;
      state.interval = initialIntervalFromMean(newBeta.mean);
    },
    intervalChanged(state, action: PayloadAction<number>) {
      state.interval = action.payload;
    },
    noteChanged(state, action: PayloadAction<string>) {
      state.note = action.payload;
    },
    mediaAttrsChanged(state, action: PayloadAction<Partial<MediaAttrs>>) {
      state.mediaAttrs = {...state.mediaAttrs, ...action.payload};
    }
  }
});

export const { playerProgressed, toggleFollow, selectionChanged, regionChanged, durationRetrieved, rangeHighlighted, languageSelected, fragmentSelected, subRangeSelected, rangedToggled, priorityChanged, intervalChanged, noteChanged, mediaAttrsChanged, reset } = medxSlice.actions;

// Actions

interface ISelectMedia {
  medFrag: MediaFragment,
  slotId: string,
  blockUuid: string
}

export const selectMedia = (selection: ISelectMedia | null) => {
  return async (dispatch: AppDispatch, getState: () => RootState) : Promise<MedxData | null> => {
    const state = getState();
    if (selection == null) return null;
    const activeMedia = state.medx.active;
    if (activeMedia && selection.slotId == activeMedia.slotId) return activeMedia;
    let medxData: MedxData | null = state.medx.active;
    const block = await logseq.Editor.getBlock(selection.blockUuid, { includeChildren: true });
    if (block) {
      const ib = IncrementalBlock.fromBlock(block);
      medxData = {
        ...selection,
        block,
        betaParams: ib.beta ? ib.beta.params : {a:1, b:1},
        interval: initialIntervalFromMean(.5)
      }
    } else {
      logseq.UI.showMsg('Block not found', 'warning');
    }
    dispatch(medxSlice.actions.medSelected(medxData));
    return medxData;
  }
}

export const reloadBlock = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const blockUuid = getState().medx.active?.block.uuid;
    if (!blockUuid) return;
    const block = await logseq.Editor.getBlock(blockUuid, { includeChildren: true });
    if (block) dispatch(medxSlice.actions.blockReloaded(block));
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

function genExtractData(medx: MedxState, extract?: Extract) : ExtractData {
  const data = medx.active!;
  const range = extract ? [extract.start, extract.end] : medx.selectRange;
  const medFrag: MediaFragment = {
    flag: ':medx_ref',
    url: data.medFrag.url,
    format: data.medFrag.format,
    volume: medx.mediaAttrs.volume,
    rate: medx.mediaAttrs.rate,
    loop: medx.mediaAttrs.loop,
    start: range[0],
    end: range[1]
  };

  const note = extract ? extract.text ?? '' : medx.note;
  const content = `${note}\n${renderFragment(medFrag)} \n{{renderer :ib}}`;
  const due = new Date();
  due.setDate(due.getDate() + medx.interval);
  const properties = {
    'ib-reps': 0,
    'ib-a': medx.betaParams.a,
    'ib-b': medx.betaParams.b,
    'ib-due': due.getTime(),
    'ib-interval': medx.interval
  };
  
  return { content, properties };
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
    const extractData = extracts.map(extract => genExtractData(medx, extract));
    const block = await logseq.Editor.insertBlock(medx.active!.block.uuid, 'Subtitles',
      { focus: false });
    if (!block) {
      logseq.UI.showMsg('Failed to create block', 'error');
      return null;
    }
    await logseq.Editor.setBlockCollapsed(block.uuid, true);
    const blocks = await logseq.Editor.insertBatchBlock(block.uuid, extractData);
    logseq.Editor.exitEditingMode();
    return blocks;
  }
}

export const extract = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const { medx } = getState();
    const active = medx.active!;
    const { content, properties } = genExtractData(medx);
    const b = await logseq.Editor.insertBlock(active.block.uuid, content,
      { properties, focus: false });
    
    // Reset
    dispatch(reset());
    await dispatch(reloadBlock());
    const range = medx.selectRange;
    //dispatch(selectionChanged(([range[1], Math.min(range[1]+(range[1]-range[0]), length)])));
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
