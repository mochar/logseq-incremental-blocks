import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../state/store";
import { QueueIb } from "../learn/learnSlice";
import { todayMidnight, toEndOfDay, toStartOfDay } from "../utils/datetime";
import { parseQueueIbs, QUEUE_IB_PULLS } from "../logseq/query";

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
  // Null means no filter on due date
  dueDate: Date | null,
  collections: Collection[],
  // collection index -> ibs in that collection
  // redux doesnt like nonseriazlbale Map, but js
  // objects cannot contain numerical keys. so we
  // just convert indices to strings and back LOL
  loadedIbs: { [key: string]: QueueIb[] },
  // TODO: currently viewing collection index
  // to jump to when coming back to page
}

const initialState: MainState = {
  busy: false,
  dueDate: null,
  collections: [],
  loadedIbs: {}
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
    dueDateSelected(state, action: PayloadAction<Date | null>) {
      state.dueDate = action.payload;
    }
  },
});

export const { gotBusy } = mainSlice.actions;

function buildIbQueryWhereBlock(state: MainState) : string {
  // Query collections, their pages, and their size
  // Handle due filter clause
  let dueWhere = '';
  if (state.dueDate) {
    const includeOutdated = true;
    dueWhere = `
    [(get ?prop :ib-due) ?due]
    [(<= ?due ${toEndOfDay(state.dueDate).getTime()})]
  `;
    if (!includeOutdated) {
      dueWhere = `
      ${dueWhere}
      [(>= ?due ${toStartOfDay(state.dueDate).getTime()})]
    `;
    }
  }

  // Handle refs. Not sure if this works, but also not necessary as ref filtering
  // in the queue happens after retrieving all due ibs.
  let refsWhere = '';
  let refs: string[] = [];
  if (refs && refs.length > 0) {
    const refString = refs.map((r) => `"${r}"`).join(', ');
    refsWhere = `
      [?page :block/name ?pagename] 
      [(contains? #{${refString}} ?pagename)] 
      (or [?b :block/refs ?page] [?bp :block/tags ?page])
    `;
  }

  return `
    ${dueWhere}
    ${refsWhere}
  `;
}

export const refreshCollections = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    if (state.main.busy) return;

    dispatch(gotBusy(true));

    const whereBlock = buildIbQueryWhereBlock(state.main);

    // Query
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
      ${whereBlock}
      ]`;
    // Returns array of two-tuples: Page data object, and page ib count number
    const ret = await logseq.DB.datascriptQuery(query);
    console.log(ret.length, ret);

    // Collapse to collections
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
    dispatch(gotBusy(false));
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
      [?b :block/page ?bp]
      [(contains? #{${pageIdsString}} ?bp)] 
      ${buildIbQueryWhereBlock(state)}
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

export const selectDueDate = (dueDate: Date | null) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    if (state.main.busy) return;
    dispatch(mainSlice.actions.dueDateSelected(dueDate));
    await dispatch(refreshCollections());
  }
}

export default mainSlice.reducer;
