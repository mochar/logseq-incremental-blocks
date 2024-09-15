import { createAsyncThunk, createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import IncrementalBlock from "../IncrementalBlock";
import { getPriorityUpdate, PriorityUpdate } from "../algorithm/priority";
import { AppDispatch, RootState } from "../state/store";
import { getBlockHierarchyContent, getFilterRefs } from "../utils/logseq";
import { nextInterval } from "../algorithm/scheduling";
import { addDays, todayMidnight } from "../utils/datetime";
import { convertBlockToIb } from "../logseq/command";
import { queryDueIbs, queryQueueIbs, sortQibsByPriority } from "../logseq/query";
import { getLogseqCards, invoke } from "../anki/anki";
import { logseq as PL } from "../../package.json";

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
  refs: Ref[],
  // Anki card id 
  cardId?: string
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

export const typeFilters = ['all', 'cards', 'blocks'] as const;
export declare type TypeFilter = typeof typeFilters[number];

export const refFilterModes = ['off', 'inclusion', 'exclusion'] as const;
export declare type RefFilterMode = typeof refFilterModes[number];

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
  refFilterMode: RefFilterMode,
  typeFilter: TypeFilter,
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
  refFilterMode: 'off',
  typeFilter: 'all',
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
    refsSelected(state, action: PayloadAction<Ref[]>) {
      state.selectedRefs = action.payload;
    },
    refFilterModeToggled(state, action: PayloadAction<RefFilterMode>) {
      state.refFilterMode = action.payload;
    },
    typeFilterSelected(state, action: PayloadAction<TypeFilter>) {
      state.typeFilter = action.payload;
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
    dueIbAdded(state, action: PayloadAction<{ qib: QueueIb, addToQueue?: boolean }>) {
      function squeezeInQueue(queue: QueueIb[], qib: QueueIb) {
        for (let i = 0; i < queue.length; i++) {
          if (queue[i].priority < qib.priority) {
            queue.splice(i, 0, qib);
            break;
          }
        }  
      }

      const qib = action.payload.qib;
      squeezeInQueue(state.dueIbs, qib);
      if (action.payload.addToQueue ?? false) {
        squeezeInQueue(state.queue, qib);
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
      .addCase(nextIb.pending, (state, action) => {
        state.queueStatus = 'busy';
      })
      .addCase(nextIb.fulfilled, (state, action) => {
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
      .addCase(nextIb.rejected, (state, action) => {
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

export const { userRefsLoaded, refsSelected, manualIntervention, dueIbAdded, dueIbRemoved, typeFilterSelected } = learnSlice.actions;

export const refreshDueIbs = createAsyncThunk<QueueIb[], void, { state: RootState }>(
  'learn/refreshDueIbs', 
  async (_, { getState }) => {
    const state = getState();

    // Incremental blocks
    const ibQibs = await queryDueIbs({ sortByPriority: false });

    // Anki cards
    let cardQibs: QueueIb[] = [];
    try {
      const cards = await getLogseqCards({ due: true, deck: state.anki.deckName });
      const qibs = await queryQueueIbs({ 
        uuids: cards.map((card: any) => card.fields.uuid.value),
        sortByPriority: true, // To set order of anki cards in deck
      });

      // One block can lead to multiple cards
      const uuidToQibs = qibs.reduce(
        (map, qib) => {
          map.set(qib.uuid, qib);
          return map;
        },
        new Map<string, QueueIb>()
      );
      
      for (const card of cards) {
        //@ts-ignore
        const qib = uuidToQibs.get(card.fields.uuid.value);
        if (qib) {
          //@ts-ignore
          cardQibs.push({...qib, cardId: card.cardId});
        }
      }
    } catch (e) {
      logseq.UI.showMsg('Failed to load anki cards', 'warning');

      // Something can go wrong with setting up the filtered deck, so even
      // if card qibs are succesfully retrieved, we can't use them.
      cardQibs = [];
    }

    // All qibs sorted by priority
    const qibs = sortQibsByPriority([...ibQibs, ...cardQibs]);
    return qibs;
  },
  {
    condition: (_, { getState }) => {
      const { learn } = getState(); 
      if (learn.refreshState == 'loading') return false;
    }
  }
);

/*
Some visual feedback is given to show that learning mode is on.
*/
async function reflectLearningChangedInGui(learning: boolean, dueIbUuid?: string) {
  // Toolbar button color
  const color = learning ? 'hotpink' : 'dimgrey';
  logseq.provideStyle(`
    #${PL.id} {
      color: ${color};
    }
  `);

  // Refresh the macro to add/remove the "next rep" button.
  // This is hacky. Should probably use macro.ts/onMacroSlotted
  // but this requires slot id and I dont know how to get it rn.
  if (dueIbUuid) {
    await logseq.Editor.editBlock(dueIbUuid);
    await logseq.Editor.exitEditingMode();
  }
}

export const stopLearning = () => {
  return (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    dispatch(learnSlice.actions.learningEnded());
    reflectLearningChangedInGui(false, state.learn.dueIbs[0].uuid);
  }
}

export const startLearning = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    let state = getState();
    const blockListenerActive = state.learn.blockListenerActive;
    const queue = selectFilteredDueIbs(state);

    // Match anki cards in filtered deck to priority order of ibs.
    const cardQibs = state.learn.queue.filter((qib) => qib.cardId != undefined);
    let order = -100_000;
    const results = (await Promise.all(cardQibs.map((cardQib) => {
      return invoke('setSpecificValueOfCard', 
        { card: cardQib.cardId, keys: ['due'], newValues: [order++]});
    })));
    console.log('due results', results);

    dispatch(learnSlice.actions.learningStarted(queue));

    state = getState();
    if (state.learn.learning) { 
      reflectLearningChangedInGui(true, state.learn.dueIbs[0].uuid);
      await dispatch(nextRep());

      if (!blockListenerActive) {
        logseq.DB.onChanged(({ blocks, txData, txMeta }) => {
          const state = getState();
          if (state.learn.learning && state.learn.autoIb && txMeta?.outlinerOp == 'insert-blocks') {
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

export const nextIb = createAsyncThunk<CurrentIBData | null, void, { state: RootState }>(
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
    if (!learn.current) return null;
    const current = {...learn.current};
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

export const nextRep = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    await dispatch(nextIb());
    await dispatch(getPriorityUpdates());
  }
}

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

      if (!current.qib.cardId) {
        // Update schedule
        const interval = nextInterval(current.ib);
        const newDue = addDays(todayMidnight(), interval);
        await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-interval', interval);
        await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-due', newDue.getTime());

        // Others
        await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-reps', current.ib.reps! + 1);
      }
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

export const laterRep = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    if (state.learn.queue.length > 1) {
      const current = state.learn.current!;
      let priority = current.ib.beta!.sample({});
      if (priority > state.learn.queue[1].priority) {
        priority = Math.max(0., state.learn.queue[1].priority - 0.01);
      }
      const qib = {...current.qib, priority };
      dispatch(dueIbAdded({ qib, addToQueue: true }));
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
    dispatch(userRefsLoaded(refs));
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

export const setRefFilterMode = (filterMode: RefFilterMode) => {
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
    state => state.learn.typeFilter
  ],
  (dueIbs, refs, mode, type) => {
    const refIds = refs.map((r) => r.id);
    return dueIbs.filter((qib) => {
      let keep = true;

      // Filter on type
      const isCard = qib.cardId != undefined;
      if (type == 'blocks') {
        keep &&= !isCard;
      } else if (type == 'cards') {
        keep &&= isCard;
      }

      // Filter on ref
      if (mode != 'off') {
        const containsRef = qib.refs.some((r) => refIds.includes(r.id));
        keep &&= mode == 'inclusion' ? containsRef : !containsRef;  
      }

      return keep;
    });
  }
);
