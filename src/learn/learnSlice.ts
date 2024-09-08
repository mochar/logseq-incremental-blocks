import { createAsyncThunk, createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import IncrementalBlock from "../IncrementalBlock";
import { getPriorityUpdate, PriorityUpdate } from "../algorithm/priority";
import { AppDispatch, RootState } from "../state/store";
import { getBlockHierarchyContent, getFilterRefs } from "../utils/logseq";
import { nextInterval } from "../algorithm/scheduling";
import { addDays, todayMidnight } from "../utils/datetime";
import { convertBlockToIb } from "../logseq/command";
import { queryDueIbs } from "../logseq/query";

export enum RepAction { 
  finish, // Rep finished, update priority and schedule
  postpone, // Move to another day, keep everything as is
  done, // Block is done, clean up and go to next rep
  next, // Simply pop the current ib, without action
}

export interface Ref {
  name: string,
  uuid: string,
  id: number
}

// Simplified ib data just for queue purposes.
export interface QueueIb {
  id: number,
  uuid: string,
  content: string,
  priority: number,
  pathRefs: Ref[],
  pageTags: Ref[],
  // pathRefs + pageTags
  refs: Ref[]
}

// Detailed data on currently learning ib
export interface CurrentIBData {
  qib: QueueIb,
  ib: IncrementalBlock,
  start: Date,
  contents: Record<string, string>,
  newContents: Record<string, string>,
  priorityUpdate?: PriorityUpdate,
  manualPriority?: number,
  manualInterval?: number,
}

export declare type FilterMode = 'inclusion' | 'exclusion';

interface Learn {
  learning: boolean,
  // The ibds due for today are stored in `dueIbs`, while the queue shown to the user
  // is stored in `queue`. Differentiate between these two when the learn queue differs
  // with the due ibs, eg when filtering, or an isolated ib is set to be learned immediately.
  dueIbs: QueueIb[],
  queue: QueueIb[],
  // Refreshing the queue
  queueStatus: 'busy' | 'idle',
  refreshDate?: Date | undefined,
  refreshState: null | 'loading' | 'fulfilled' | 'failed',
  // Refs to filter on
  refs: Ref[],
  selectedRefs: Ref[],
  refFilterMode: FilterMode,
  current: CurrentIBData | null,
  // Whether or not we have started listening for new block events, as the listener
  // should only be installed once.
  blockListenerActive: boolean,
  // Whether or not to auto ib when learning
  autoIb: boolean
}

const initialState: Learn = {
  learning: false,
  dueIbs: [],
  queue: [],
  queueStatus: 'idle',
  refs: [],
  selectedRefs: [],
  refFilterMode: 'inclusion',
  current: null,
  refreshState: null,
  blockListenerActive: false,
  autoIb: logseq.settings?.learnAutoIb as boolean ?? false
}

const learnSlice = createSlice({
  name: 'learn',
  initialState,
  reducers: {
    userRefsLoaded(state, action: PayloadAction<Ref[]>) {
      state.refs = action.payload;
    },
    refToggled(state, action: PayloadAction<{ refName: string, state?: boolean }>) {
      // Add or remove ref from selectedRefs
      const selectedRefNames = state.selectedRefs.map((r) => r.name);
      const selectedIndex = selectedRefNames.indexOf(action.payload.refName);
      const add = action.payload.state == undefined ? selectedIndex == -1 : action.payload.state;
      if (add && selectedIndex == -1) {
        const ref = state.refs.find((r) => r.name == action.payload.refName);
        if (ref) {
          state.selectedRefs.push(ref);
        }
      } else if (!add && selectedIndex > -1) {
        state.selectedRefs.splice(selectedIndex, 1);
      }
    },
    refFilterModeToggled(state, action: PayloadAction<FilterMode | undefined>) {
      state.refFilterMode = action.payload ?? (state.refFilterMode == 'inclusion' ? 'exclusion' : 'inclusion');
    },
    learningStarted(state, action: PayloadAction<QueueIb[]>) {
      if (state.learning) return;
      state.learning = true;
      state.queue = action.payload;
      // Assume listener activated on first learn
      if (!state.blockListenerActive) {
        state.blockListenerActive = true;
      }
    },
    learningEnded(state) {
      if (!state.learning) return;
      state.queue = [];
      state.current = null;
      state.learning = false;
    },
    manualIntervention(state, action: PayloadAction<{ priority?: number | null, interval?: number | null }>) {
      if (!state.current) return;
      const intervention = action.payload;
      if (intervention.priority !== undefined) state.current.manualPriority = intervention.priority ?? undefined;
      if (intervention.interval !== undefined) state.current.manualInterval = intervention.interval ?? undefined;
    },
    dueIbRemoved(state, action: PayloadAction<string>) {
      const uuid = action.payload;
      for (let i = 0; i < state.dueIbs.length; i++) {
        if (state.dueIbs[i].uuid == uuid) {
          state.dueIbs.splice(i, 1);
        }
      }
    },
    dueIbAdded(state, action: PayloadAction<QueueIb>) {
      const qib = action.payload;
      for (let i = 0; i < state.dueIbs.length; i++) {
        if (state.dueIbs[i].priority < qib.priority) {
          state.dueIbs.splice(i, 0, qib);
          break;
        }
      }
    }
  },
  extraReducers: builder => {
    builder
      .addCase(refreshDueIbs.pending, (state, action) => {
        state.refreshState = 'loading';
      })
      .addCase(refreshDueIbs.fulfilled, (state, action) => {
        state.dueIbs = action.payload;
        state.refreshDate = new Date();
        state.refreshState = 'fulfilled';
      })
      .addCase(refreshDueIbs.rejected, (state, action) => {
        state.refreshDate = new Date();
        state.refreshState = 'failed';
      })
      .addCase(nextRep.pending, (state, action) => {
        state.queueStatus = 'busy';
      })
      .addCase(nextRep.fulfilled, (state, action) => {
        state.queueStatus = 'idle';
        if (state.queue.length == 0) {
          state.current = null;
        } else {
          // Remove current from queue
          if (state.current) {
            state.dueIbs.shift();
            state.queue.shift();
          }
          state.current = action.payload;
        }
      })
      .addCase(nextRep.rejected, (state, action) => {
        state.queueStatus = 'idle';
      })
      .addCase(getPriorityUpdates.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(toggleAutoIb.fulfilled, (state, action) => {
        state.autoIb = action.payload;
      })
  }
});

export const { userRefsLoaded, manualIntervention, dueIbAdded, dueIbRemoved } = learnSlice.actions;

export const refreshDueIbs = createAsyncThunk<QueueIb[], void, { state: RootState }>(
  'learn/refreshDueIbs', 
  async (_, { getState }) => {
    const qibs = await queryDueIbs({});
    return qibs;
  },
  {
    condition: (_, { getState }) => {
      const { learn } = getState(); 
      if (learn.refreshState == 'loading') return false;
    }
  }
);

export const stopLearning = () => {
  return (dispatch: AppDispatch, getState: () => RootState) => {
    dispatch(learnSlice.actions.learningEnded());
  }
}

export const startLearning = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    let state = getState();
    const blockListenerActive = state.learn.blockListenerActive;
    dispatch(learnSlice.actions.learningStarted(selectFilteredDueIbs(state)));
    state = getState();
    if (state.learn.learning) { 
      await dispatch(nextRep());
      if (!blockListenerActive) {
        logseq.DB.onChanged(({ blocks, txData, txMeta }) => {
          // console.log('------------------')
          // console.log(txMeta?.outlinerOp);
          // console.log(blocks, txData)
          // console.log('------------------')
          const state = getState();
          if (state.learn.learning && state.learn.autoIb && txMeta?.outlinerOp == 'insert-blocks') {
            // console.log('converting to ib');
            blocks.forEach(async (block) => {
              convertBlockToIb({
                uuid: block.uuid,
                block,
                backToEditing: true
              });
            });
          }
        });
      }
    }
  }
}

export const nextRep = createAsyncThunk<CurrentIBData | null, void, { state: RootState }>(
  'learn/nextRep', 
  async (_, { getState, dispatch }) => {
    const { learn } = getState();
    let ibData: CurrentIBData | null = null;
    const i = learn.current ? 1 : 0;
    if (learn.queue.length > i) {
      const qib = learn.queue[i];
      const contents = await getBlockHierarchyContent(qib.uuid, 3);
      const ib = await IncrementalBlock.fromUuid(qib.uuid, { propsOnly: false });
      ibData = {
        qib,
        ib,
        start: new Date(),
        contents: contents,
        newContents: contents
      };
    }
    return ibData;
  },
  {
    condition: (_, { getState }) => {
      const { learn } = getState(); 
      if (learn.queueStatus == 'busy') return false;
    }
  }
);

export const getPriorityUpdates = createAsyncThunk<CurrentIBData | null, void, { state: RootState }>(
  'learn/getPriorityUpdate', 
  async (_, { getState, dispatch }) => {
    const { learn } = getState();
    const current = {...learn.current!};
    current.newContents = await getBlockHierarchyContent(current.ib.uuid, 3);
    current.priorityUpdate = getPriorityUpdate(current);
    return current;
  },
  {
    condition: (_, { getState }) => {
      const { learn } = getState(); 
      if (learn.current == null) {
        return false;
      }
    }
  }
);

/*
 * TODO: replace upserts with updateBlock
 */
export const finishRep = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const { learn } = getState();
    let current = learn.current;
    if (current) {
      // Update priority 
      const newBeta = current.ib.beta!.copy();
      if (current.manualPriority) {
        newBeta.mean = current.manualPriority;
      } else {
        await dispatch(getPriorityUpdates());
        const state = getState();
        current = state.learn.current!;
        newBeta.applyPriorityUpdate(current.priorityUpdate!);
      }
      await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-a', newBeta.a);
      await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-b', newBeta.b);

      // Update schedule
      const interval = nextInterval(current.ib);
      const newDue = addDays(todayMidnight(), interval);
      await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-interval', interval);
      await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-due', newDue.getTime());

      // Others
      await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-reps', current.ib.reps! + 1);
    }
    await dispatch(nextRep());
  }
}

export const postponeRep = (postponeInterval: number) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const { learn } = getState();
    let current = learn.current;
    if (current) {
      const newDue = addDays(todayMidnight(), postponeInterval);
      await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-due', newDue.getTime());
    }
    await dispatch(nextRep());
  }
}

export const doneRep = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const { learn } = getState();
    let current = learn.current;
    if (current) {
      // Get newest content
      const ib = await IncrementalBlock.fromUuid(current.ib.uuid, { propsOnly: false });
      await ib.done();
    }
    await dispatch(nextRep());
  }
}

export const toggleAutoIb = createAsyncThunk<boolean, boolean, { state: RootState }>(
  'learn/toggleAutoIb', 
  (toOn, { getState, dispatch }) => {
    logseq.updateSettings({ learnAutoIb: toOn });
    return toOn;
  },
  {
    condition: (toOn, { getState }) => {
      const { learn } = getState(); 
      if (learn.autoIb == toOn) {
        return false;
      }
    }
  }
);

export const getUserRefs = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const refNames = getFilterRefs();
    if (refNames.length == 0) return;
    const refString = refNames.map((r) => `"${r}"`).join(', ');
    const query = `[
      :find ?p ?n ?u
      :where
        [?p :block/name ?n]
        [(contains? #{${refString}} ?n)]
        [?p :block/uuid ?u]
    ]`;
    const ret = await logseq.DB.datascriptQuery(query);
    const refs = (ret as []).map<Ref>((r) => { return { id: r[0], name: r[1], uuid: r[2] } });
    dispatch(userRefsLoaded(refs))
  }
}

export const toggleRef = (refName: string, state?: boolean) => {
  return (dispatch: AppDispatch) => {
    dispatch(learnSlice.actions.refToggled({ refName, state }));
  }
}

export const removeRef = (refName: string) => {
  return async (dispatch: AppDispatch, getState: () => RootState) : Promise<string[]> => {
    // Remove from selected refs if there
    dispatch(toggleRef(refName, false));
    // Remove ref from settings
    const state = getState();
    const refs = state.learn.refs.map((r) => r.name);
    refs.splice(refs.indexOf(refName), 1);
    logseq.updateSettings({ subsetQueries: refs.join(', ') });
    // Get updated user refs
    await dispatch(getUserRefs());
    return refs;
  }
}

export const toggleFilterMode = (filterMode?: FilterMode) => {
  return (dispatch: AppDispatch) => {
    dispatch(learnSlice.actions.refFilterModeToggled(filterMode));
  }
}

export default learnSlice.reducer;

export const selectFilteredDueIbs = createSelector.withTypes<RootState>()(
  [
    state => state.learn.dueIbs, 
    state => state.learn.selectedRefs, 
    state => state.learn.refFilterMode, 
  ],
  (dueIbs, refs, mode) => {
    if (refs.length == 0) {
      return dueIbs;
    } 
    const refIds = refs.map((r) => r.id);
    return dueIbs.filter((qib) => {
      const containsRef = qib.refs.some((r) => refIds.includes(r.id));
      return mode == 'inclusion' ? containsRef : !containsRef;
    });
  }
);
