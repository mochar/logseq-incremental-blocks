import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../state/store";
import { buildIbQueryWhereBlock, parseQueueIbs, queryIbRefs, queryTotalDue, QUEUE_IB_PULLS } from "../logseq/query";
import { Equality, IbFilters, QueueIb, Ref } from "../types";
import { todayMidnight } from "../utils/datetime";

interface Collection {
  name: string,
  pageIds: string[],
  count: number
}

interface CollectionIbs {
  index: number,
  ibs: QueueIb[]
}

interface MainState {
  busy: boolean,
  totalDue?: number,
  filters: IbFilters,
  collections: Collection[],
  refs: Ref[],
  // collection index -> ibs in that collection.
  // Doubles as a "selectedCollections" object.
  // Redux doesnt like nonseriazlbale Map, but js
  // objects cannot contain numerical keys. so we
  // just convert indices to strings and back LOL
  loadedIbs: { [key: string]: QueueIb[] },
}

const initialState: MainState = {
  busy: false,
  filters: {
    dueDate: null,
    dueDateEq: '≤',
    refs: null,
    refsMode: 'or'
  },
  collections: [],
  loadedIbs: {},
  refs: []
}

const mainSlice = createSlice({
  name: 'main',
  initialState,
  reducers: {
    gotBusy(state, action: PayloadAction<boolean>) {
      state.busy = action.payload;
    },
    collectionsLoaded(state, action: PayloadAction<Collection[]>) {
      state.collections = action.payload;
      state.loadedIbs = {};
    },
    refsLoaded(state, action: PayloadAction<Ref[]>) {
      state.refs = action.payload;
    },
    refsSelected(state, action: PayloadAction<Ref[]>) {
      state.filters.refs = action.payload;
    },
    collectionsOpened(state, action: PayloadAction<CollectionIbs[]>) {
      for (const collection of action.payload) {
        state.loadedIbs[collection.index.toString()] = collection.ibs;
      }
    },
    collectionsClosed(state, action: PayloadAction<number[]>) {
      for (const index of action.payload) {
        delete state.loadedIbs[index.toString()];
      }
    },
    dueDateSelected(state, action: PayloadAction<{ date: number | null, eq: Equality }>) {
      state.filters.dueDate = action.payload.date;
      state.filters.dueDateEq = action.payload.eq;
    },
    totalDueLoaded(state, action: PayloadAction<number>) {
      state.totalDue = action.payload;
    }
  },
});

export const { gotBusy } = mainSlice.actions;

/*
 * Update all:
 * - Total due today.
 * - All ib tags.
 * - Filtered collections.
 */
export const refreshAll = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    if (state.main.busy) return;

    dispatch(gotBusy(true));

    // Total due
    const totalDue = await queryTotalDue(todayMidnight());
    dispatch(mainSlice.actions.totalDueLoaded(totalDue));
    
    // All refs/tags
    const refs = await queryIbRefs();
    dispatch(mainSlice.actions.refsLoaded(refs));
 
    // Filtered collections
    dispatch(refreshCollections(false));
    
    dispatch(gotBusy(false));
  }
}

/*
 * Refresh collections/pages based on current filters.
 */
export const refreshCollections = (busyAware = true) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();

    if (busyAware) {
      if (state.main.busy) return;
      dispatch(gotBusy(true));
    }

    // Query pages that contain requested ibs
    const query = `[
    :find
      (pull ?bp [
        :db/id
        :block/uuid 
        :block/name
        :block/properties
        :block/journal?
      ]) 
      (count ?b)
    :where
      [?b :block/properties ?prop]
      [?b :block/page ?bp]
      [(get ?prop :ib-a) _]
      [(get ?prop :ib-b) _]
      ${buildIbQueryWhereBlock(state.main.filters)}
      ]`;
    // Returns array of two-tuples: Page data object, and page ib count number
    const ret = await logseq.DB.datascriptQuery(query);

    // Collapse pages to collections
    const collectionMap: { [ key: string ]: { pageIds: Set<string>, count: number } } = {};
    for (const result of ret) {
      const [page, count] = result;
      const collection = page['journal?'] as boolean ? 'journal' : (page['properties']?.collection ?? page['name']);
      if (collectionMap.hasOwnProperty(collection)) {
        collectionMap[collection].pageIds.add(page.id);
        collectionMap[collection].count += count;
      } else {
        collectionMap[collection] = {
          pageIds: new Set([page.id]),
          count: count
        };
      }
    }
    const collections = Object.keys(collectionMap).map<Collection>(c => {
      const map = collectionMap[c];
      return { name: c, pageIds: [...map.pageIds], count: map.count };
    });
    
    dispatch(mainSlice.actions.collectionsLoaded(collections));

    if (busyAware) dispatch(gotBusy(false));
  }
}

async function loadCollectionsIbs(state: MainState, collectionIndices: number[]) : Promise<CollectionIbs[]> {
  const collections = collectionIndices.map(i => state.collections[i]);
  const pageIdsString = collections
    .reduce((ids, c) => ids.concat(c.pageIds), new Array<string>())
    .map((id) => `${id}`).join(', ');

  // Query
  const query = `[
    :find
      ${QUEUE_IB_PULLS}
    :where
      [?b :block/properties ?prop]
      [(get ?prop :ib-a) _]
      [(get ?prop :ib-b) _]
      [?b :block/page ?bp]
      [(contains? #{${pageIdsString}} ?bp)] 
      ${buildIbQueryWhereBlock(state.filters)}
      ]`;
  // Returns array of two-tuples: Page data object, and page ib count number
  const ret = await logseq.DB.datascriptQuery(query);
  const qibs = parseQueueIbs({ result: ret, sortByPriority: true });

  // Need to map back ib to collection index
  const collectionMap = new Map<string, QueueIb[]>();
  for (const qib of qibs) {
    const collection = qib.page.collection ?? qib.page.name;
    if (collectionMap.has(collection)) {
      collectionMap.get(collection)!.push(qib);
    } else {
      collectionMap.set(collection, [qib]);
    }
  }
  const collectionNames = state.collections.map(c => c.name);
  const collectionIbs = collectionMap.keys().map(cn => {
    return {
      index: collectionNames.indexOf(cn),
      ibs: collectionMap.get(cn)!
    }
  }).toArray();

  return collectionIbs;
}

export const toggleCollections = (collectionIndices: number[]) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    if (state.main.busy) return;

    dispatch(gotBusy(true));

    // If already open, simply close. If we have closed all, return.
    const openedIndices = collectionIndices.filter(i => i.toString() in state.main.loadedIbs);
    dispatch(mainSlice.actions.collectionsClosed(openedIndices));
    if (openedIndices.length === collectionIndices.length) {
        dispatch(gotBusy(false));
        return;
    }

    const closedIndices = collectionIndices.filter(i => !(i.toString() in state.main.loadedIbs));
    const collectionIbs = await loadCollectionsIbs(state.main, closedIndices);
    
    dispatch(mainSlice.actions.collectionsOpened(collectionIbs));
    dispatch(gotBusy(false));
  }
}

export const toggleAllCollections = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    if (state.main.busy) return;

    // Don't set busy state as that is done in toggleCollections.

    const loadedIndices = Object.keys(state.main.loadedIbs).map(i => parseInt(i));
    const nLoaded = loadedIndices.length;
    const nTotal = state.main.collections.length;
    if (nLoaded === 0 || nLoaded === nTotal) {
      await dispatch(toggleCollections([...Array(nTotal).keys()]));
    } else {
      const toToggle = Array(nTotal).keys().filter(i => !loadedIndices.includes(i)).toArray();
      await dispatch(toggleCollections(toToggle));
    }
  }
}

export const selectDueDate = ({ date, eq }: { date?: Date | null, eq?: Equality }) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    if (state.main.busy) return;
    dispatch(mainSlice.actions.dueDateSelected({
      date: date === undefined ? state.main.filters.dueDate : (date?.getTime() ?? null),
      eq: eq ?? state.main.filters.dueDateEq
    }));
    await dispatch(refreshCollections());
  }
}

export const toggleRef = (ref: Ref) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const selected = state.main.filters.refs ?? [];
    const index = selected.findIndex(r => r.id == ref.id);
    const refs = index == -1
      ? [...selected, ref]
      : selected.toSpliced(index, 1);
    dispatch(mainSlice.actions.refsSelected(refs));
    await dispatch(refreshCollections());
  }
}

export default mainSlice.reducer;
