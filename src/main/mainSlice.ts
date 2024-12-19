import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../state/store";
import { queryDueIbs } from "../logseq/query";
import { QueueIb } from "../learn/learnSlice";

interface Collection {
  name: string,
  pageUuids: string[],
  count: number
}

interface MainState {
  busy: boolean,
  dueDate: Date | null, 
  ibs: QueueIb[],
  collections: Collection[]
}

const initialState: MainState = {
  busy: false,
  dueDate: null,
  ibs: [],
  collections: [],
}

const mainSlice = createSlice({
  name: 'main',
  initialState,
  reducers: {
    gotBusy(state, action: PayloadAction<boolean>) {
      state.busy = action.payload;
    },
    ibsLoaded(state, action: PayloadAction<QueueIb[]>) {
      let ibs = action.payload;

      // Get the collections from the ibs
      // TODO: Potential name collision if page exist with same name as collection
      const collectionMap: { [ key: string ]: { pageUuids: Set<string>, count: number } } = {};
      for (const ib of ibs) {
        const collection = ib.page.collection ?? ib.page.name;
        if (collectionMap.hasOwnProperty(collection)) {
          collectionMap[collection].pageUuids.add(ib.page.uuid);
          collectionMap[collection].count += 1;
        } else {
          collectionMap[collection] = {
            pageUuids: new Set([ib.page.uuid]),
            count: 1
          };
        }
      }
      state.collections = Object.keys(collectionMap).map<Collection>(c => {
        const map = collectionMap[c];
        return { name: c, pageUuids: [...map.pageUuids], count: map.count };
      });

      // Order the ibs by collection
      const groupedIbs = ibs.reduce((groupedIbs, ib) => {
        const groupIndex = Object.keys(collectionMap).indexOf(ib.page.collection ?? ib.page.name);
        // TODO: Should never happen
        if (groupIndex === -1) return groupedIbs;
        groupedIbs[groupIndex] = [...groupedIbs[groupIndex], ib];
        return groupedIbs;
      }, new Array(state.collections.length).fill([]));

      state.ibs = groupedIbs.flat();
    }
  },
});

export const { gotBusy } = mainSlice.actions;

export const refreshIbs = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    dispatch(gotBusy(true));
    const state = getState();
    const ibs = await queryDueIbs({ dueAt: state.main.dueDate || undefined });
    dispatch(mainSlice.actions.ibsLoaded(ibs));
    dispatch(gotBusy(false));
  }
}

export default mainSlice.reducer;

// TODO: Add filters
export const selectIbPages = createSelector.withTypes<RootState>()(
  [
    state => state.main.ibs,
  ],
  (ibs) => {
    const pages = [...new Map(ibs.map(ib => [ib.page.uuid, ib.page])).values()];
    return pages;
  }
);

// TODO: Filter & sorting
export const selectIbCollections = createSelector.withTypes<RootState>()(
  [
    state => state.main.ibs,
  ],
  (ibs) => {
    const pages = [...new Map(ibs.map(ib => [ib.page.uuid, ib.page])).values()];
    return pages;
  }
);

