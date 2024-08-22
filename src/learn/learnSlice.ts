import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import IncrementalBlock from "../IncrementalBlock";
import { getPriorityUpdate, PriorityUpdate } from "../algorithm/priority";
import { queryDueIbs } from "../logseq/query";
import { AppDispatch, RootState } from "../state/store";
import { getBlockHierarchyContent, getFilterRefs } from "../utils/logseq";
import { nextInterval } from "../algorithm/scheduling";
import { addDays, todayMidnight } from "../utils/datetime";
import { convertBlockToIb } from "../logseq/command";

export interface CurrentIBData {
  ib: IncrementalBlock,
  start: Date,
  contents: Record<string, string>,
  newContents: Record<string, string>,
  priorityUpdate?: PriorityUpdate,
  manualPriority?: number,
  manualInterval?: number,
}

export enum RepAction { 
  finish, // Rep finished, update priority and schedule
  postpone, // Move to another day, keep everything as is
  done, // Block is done, clean up and go to next rep
  next, // Simply pop the current ib, without action
}

interface Learn {
  learning: boolean,
  // The ibds due for today are stored in `dueIbs`, while the queue shown to the user
  // is stored in `queue`. Differentiate between these two when the learn queue differs
  // with the due ibs, eg when an ib is set to be learned immediately.
  dueIbs: IncrementalBlock[],
  queue: IncrementalBlock[],
  queueStatus: 'busy' | 'idle',
  refreshDate?: Date | undefined,
  refreshState: null | 'loading' | 'fulfilled' | 'failed',
  refs: string[],
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
  current: null,
  refreshState: null,
  blockListenerActive: false,
  autoIb: logseq.settings?.learnAutoIb as boolean ?? false
}

const learnSlice = createSlice({
  name: 'learn',
  initialState,
  reducers: {
    refToggled(state, action: PayloadAction<{ ref: string, state?: boolean }>) {
      const index = state.refs.indexOf(action.payload.ref);
      const add = action.payload.state == undefined ? index == -1 : action.payload.state;
      if (add && index == -1) {
        state.refs.push(action.payload.ref);
      } else if (!add && index > -1) {
        state.refs.splice(index, 1);
      }
    },
    learningStarted(state, action: PayloadAction<IncrementalBlock[]>) {
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
    dueIbAdded(state, action: PayloadAction<IncrementalBlock>) {
      const ib = action.payload;
      if (!ib.dueToday() || !ib.beta) return;
      const sample = ib.beta.sample({ seedToday: true });
      for (let i = 0; i < state.dueIbs.length; i++) {
        if (state.dueIbs[i].sample! < sample) {
          state.dueIbs.splice(i, 0, ib);
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

export const { refToggled, manualIntervention, dueIbAdded, dueIbRemoved } = learnSlice.actions;

export const refreshDueIbs = createAsyncThunk<IncrementalBlock[], void, { state: RootState }>(
  'learn/refreshDueIbs', 
  async (_, { getState }) => {
    const state = getState();
    let ibs = await queryDueIbs({ refs: state.learn.refs });
    ibs = ibs.sort((a, b) => b.sample! - a.sample!);
    return ibs;
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

export const startLearning = (queue?: IncrementalBlock[]) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    let state = getState();
    const blockListenerActive = state.learn.blockListenerActive;
    queue = queue ?? state.learn.dueIbs;
    dispatch(learnSlice.actions.learningStarted(queue));
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
      const ib = learn.queue[i];
      const contents = await getBlockHierarchyContent(ib.uuid, 3);
      ibData = {
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

export const toggleRef = (ref: string) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    dispatch(refToggled({ ref }));
    dispatch(refreshDueIbs());
  }
};

export const removeRef = (ref: string) => {
  return async (dispatch: AppDispatch, getState: () => RootState) : Promise<string[]> => {
    dispatch(refToggled({ ref, state: false }));
    dispatch(refreshDueIbs());
    const refs = getFilterRefs();
    refs.splice(refs.indexOf(ref), 1);
    logseq.updateSettings({ subsetQueries: refs.join(', ') });
    return refs;
  }
}

export default learnSlice.reducer;
