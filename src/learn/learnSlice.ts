import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getPriorityUpdate, PriorityUpdate } from "../algorithm/priority";
import { AppDispatch, RootState } from "../state/store";
import { getBlockHierarchyContent } from "../utils/logseq";
import { nextInterval } from "../algorithm/scheduling";
import { addDays, todayMidnight } from "../utils/datetime";
import { convertBlockToIb } from "../logseq/command";
import { logseq as PL } from "../../package.json";
import { BetaParams, IncrementalBlock, QueueItem, Timestamp } from "../types";
import { parseQueueIbs, QUEUE_IB_PULLS } from "../logseq/query";
import { buildIbQueryWhereBlock } from "../main/mainSlice";
import Beta from "../algorithm/beta";
import { doneIb, ibFromProperties } from "../ib";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";

export enum Popover { none, priority, schedule, actions, queue }

export enum RepAction { 
  finish, // Rep finished, update priority and schedule
  postpone, // Move to another day, keep everything as is
  done, // Block is done, clean up and go to next rep
  next, // Simply pop the current ib, without action
}

// Detailed data on currently learning ib
export interface CurrentIBData {
  item: QueueItem,
  ib: IncrementalBlock,
  block: BlockEntity,
  start: Timestamp,
  contents: Record<string, string>,
  newContents: Record<string, string>,
  priorityUpdate?: PriorityUpdate,
  manualPriority?: number,
  manualInterval?: number,
  newPriority: BetaParams,
  newInterval: number
}

interface LearnState {
  learning: boolean,
  learnStart?: Timestamp,
  // Whether or not anki cards should be part of queue
  anki: boolean,
  queue: QueueItem[],
  busy: boolean,
  current: CurrentIBData | null,
  // Whether or not we have started listening for new block events, as the listener
  // should only be installed once.
  blockListenerActive: boolean,
  // Whether or not to auto ib when learning
  autoIb: boolean,
  popover: Popover
}

const initialState: LearnState = {
  learning: false,
  anki: false,
  queue: [],
  busy: false,
  current: null,
  blockListenerActive: false,
  autoIb: logseq.settings?.learnAutoIb as boolean ?? false,
  popover: Popover.none
}

const learnSlice = createSlice({
  name: 'learn',
  initialState,
  reducers: {
    learningStarted(state, action: PayloadAction<QueueItem[]>) {
      if (state.learning) return;
      state.learning = true;
      state.learnStart = (new Date()).getTime();
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
      state.learnStart = undefined;
    },
    manuallyPrioritized(state, action: PayloadAction<number | null>) {
      if (!state.current) return;
      const priority = action.payload;
      state.current.manualPriority = priority ?? undefined;
      if (priority) {
        // Calculate updated params based on manual priority
        const newBeta = Beta.fromParams(state.current.ib.betaParams);
        newBeta.mean = priority;
        state.current.newPriority = newBeta.params;
      } else {
        // Calculate updated params based on priority update
        if (state.current.priorityUpdate) {
          const newBeta = Beta.fromParams(state.current.ib.betaParams);
          newBeta.applyPriorityUpdate(state.current.priorityUpdate);
          state.current.newPriority = newBeta.params;
        }
      }
    },
    manuallyScheduled(state, action: PayloadAction<number | null>) {
      if (!state.current) return;
      const interval = action.payload;
      state.current.manualInterval = interval ?? undefined;
      if (interval) {
        state.current.newInterval = interval;
      } else {
        state.current.newInterval = nextInterval(state.current.ib);
      }
    },
    queueItemRemoved(state, action: PayloadAction<string>) {
      const uuid = action.payload;
      for (let i = 0; i < state.queue.length; i++) {
        if (state.queue[i].uuid == uuid) {
          state.queue.splice(i, 1);
          break;
        }
      }        
    },
    queueItemAdded(state, action: PayloadAction<QueueItem>) {
      const item = action.payload;
      for (let i = 0; i < state.queue.length; i++) {
        if (state.queue[i].priority < item.priority) {
          state.queue.splice(i, 0, item);
          break;
        }
      }  
    },
    popoverVisible(state, action: PayloadAction<Popover>) {
      state.popover = action.payload;
    }
  },
  extraReducers: builder => {
    builder
      .addCase(nextIb.pending, (state, action) => {
        state.busy = true;
      })
      .addCase(nextIb.fulfilled, (state, action) => {
        state.busy = false;
        if (state.current) {
          state.queue.shift();
        }
        state.current = action.payload;
      })
      .addCase(nextIb.rejected, (state, action) => {
        console.error('next ib rejected');
        state.busy = false;
      })
      .addCase(getPriorityUpdates.fulfilled, (state, action) => {
        state.current = action.payload;
      })
      .addCase(toggleAutoIb.fulfilled, (state, action) => {
        state.autoIb = action.payload;
      })
  }
});

export const { manuallyPrioritized, manuallyScheduled, queueItemAdded, queueItemRemoved, popoverVisible } = learnSlice.actions;


/*
 * Some visual feedback is given to show that learning mode is on.
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
    reflectLearningChangedInGui(false);
  }
}

export const startLearning = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    let state = getState();
    const blockListenerActive = state.learn.blockListenerActive;
    
    //await dispatch(getCurrentReviewCard());

    // Get queue priorities
    const query = `[
      :find
        ${QUEUE_IB_PULLS}
      :where
        [?b :block/properties ?prop]
        [?b :block/page ?bp]
        [(get ?prop :ib-a) _]
        [(get ?prop :ib-b) _]
        ${buildIbQueryWhereBlock(state.main)}
        ]`;
    // Returns array of two-tuples: Page data object, and page ib count number
    const ret = await logseq.DB.datascriptQuery(query);
    const qibs = parseQueueIbs({ result: ret, sortByPriority: true });
    const queue = qibs.map<QueueItem>(ib => {
      return { type: 'source', uuid: ib.uuid, priority: ib.priority }
    });
    dispatch(learnSlice.actions.learningStarted(queue));

    state = getState();
    if (state.learn.learning) { 
      reflectLearningChangedInGui(true);
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

/*
Retrieves next ib from queue and updates state accordingly.
Does not clean up current ib, and therefore should not be
called directly, but as a final step of a repetition action.
*/
export const nextIb = createAsyncThunk<CurrentIBData | null, void, { state: RootState }>(
  'learn/nextIb', 
  async (_, { getState, dispatch }) => {
    let { learn } = getState();

    // Check if there's another element in the queue.
    // Since during review the current element stays at top of the queue,
    // the index that we have to check depends on if there's
    // currently an active element that is being reviewed or not.
    const getNextItem = (): QueueItem | undefined => learn.queue[learn.current ? 1 : 0];

    // If the next ib is a card, need to make sure that
    // we are in sync with anki queue.
    let nextItem = getNextItem();
    /*
    if (nextItem && learn.anki && nextItem.type == 'card') {
      try {
        // Check if any cards were reviewed during duration of current ib,
        // or, if first element in queue, since start time of learning.
        const since = learn.current?.start ?? learn.learnStart!;
        let reviews = await getDeckReviews(anki.deckName,
          toUnixTimestamp(since)
        );

        // Filter reviews to remove current card reviews, if they exist.
        // This happens when current qib is a card. Since finishRep
        // is responsible for handling the card, we can filter its reps.
        const currentCardId = learn.current?.qib.cardId;
        if (currentCardId) {
          reviews = reviews.filter((r) => r.cardID != currentCardId);
        }

        // Handle additional reviews made by user.
        // Check if the cards are no longer in filtered deck, and if so
        // remove from queue.
        if (reviews.length > 0) {
          const cards = await getCardData(reviews.map((r) => r.cardID));
          if (cards.length != reviews.length) {
            throw new Error('Could not get card data for one or more cards')
          }

          // Remove qibs of cards that have been reviewed and are no longer
          // in the deck.
          for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            if (card.deckName != anki.deckName) {
              dispatch(queueItemRemoved(card.fields.uuid.value as string));
              reviews.splice(i, 1);
            }
          }

          // The remainder of reviews pertain cards that have been reviewed
          // but are still in the deck. Since their due value no longer
          // corresponds to their priority order, we have to fix that.
          if (reviews.length > 0) {
            //@ts-ignore
            await dispatch(orderCardsInDeck({ by: 'queue' }));            
          }
          
        }
      } catch (e: any) {
        logseq.UI.showMsg('Anki error: ' + e.toString(), 'error');
        //@ts-ignore
        dispatch(stopLearning());
        throw e;
      }
    }
    */

    // Retrieve next qib's data.
    // Since the next qib may potentially have changed if it was a
    // reviewed card, re-get the next qib in line.
    let nextIbData: CurrentIBData | null = null;
    ({ learn } = getState());
    nextItem = getNextItem();
    
    if (nextItem) {
      // Get the next ib and its metadata.
      const block = await logseq.Editor.getBlock(nextItem.uuid, {includeChildren: false});
      if (!block) {
        //@ts-ignore
        dispatch(stopLearning());
        logseq.UI.showMsg('Block not found', 'error');
        return;
      }
      const contents = await getBlockHierarchyContent(nextItem.uuid, 3);
      const ib = ibFromProperties(block.uuid, block.properties ?? {});
      nextIbData = {
        item: nextItem,
        block,
        ib,
        start: (new Date()).getTime(),
        contents: contents,
        newContents: contents,
        newPriority: {...ib.betaParams},
        newInterval: nextInterval(ib)
      };
    }
    return nextIbData;
  },
  {
    condition: (_, { getState }) => {
      const { learn } = getState(); 
      if (learn.busy) return false;
    }
  }
);

export const getPriorityUpdates = createAsyncThunk<CurrentIBData | null, void, { state: RootState }>(
  'learn/getPriorityUpdate', 
  async (_, { getState, dispatch }) => {
    const { learn } = getState();
    if (!learn.current) return null;
    const current: CurrentIBData = {...learn.current};
    current.newContents = await getBlockHierarchyContent(current.ib.uuid, 3);
    current.priorityUpdate = getPriorityUpdate(current);
    if (!current.manualPriority) {
      const newBeta = Beta.fromParams(current.ib.betaParams);
      newBeta.applyPriorityUpdate(current.priorityUpdate);
      current.newPriority = newBeta.params;
    }
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

    const openIb = logseq.settings?.learnAutoOpen as boolean ?? true;
    if (openIb) {
      const { learn } = getState();
      if (learn.current) {
        logseq.App.pushState('page', { name: learn.current.item.uuid })
      }
    }
  }
}

/*
Repetition has been completed. Updates priority and scheduling accordingly.

TODO: replace upserts with updateBlock
*/
export const finishRep = (opts?: {}) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const { learn } = getState();
    let current = learn.current;
    
    if (current) {
      /*
      // If card, confirm card was reviewed
      const cardId = current.qib.cardId;
      if (cardId) {
	try {
	  const reviews = (await getCardReviews([cardId]))[cardId];
	  const reviewsAfterStart = reviews
            .filter((r) => r.id >= toUnixTimestamp(current!.start));

          // If card was not reviewed, then finishRep button should not
          // be able to be pressed. Hence this state should be unreachable
          // and we throw an error.
	  if (reviewsAfterStart.length == 0) {
	    throw new Error('Card not reviewed')
	  }

          // If card was reviewed, but still in deck (failed to recall or
          // still learning), have to add again to queue with new priority.
          // This is essentially the functionality of laterRep, so we just
          // re-use it here.
          const cardData = (await getCardData([cardId]))[0];
          if (cardData.deckName == anki.deckName) {
            await dispatch(laterRep({ next: false }));  
          }
          
	} catch (e: any) {
	  logseq.UI.showMsg(e.toString(), 'error');
	  dispatch(stopLearning());
	  return;
	}
      }
      */
      
      // Update priority
      let newBeta = Beta.fromParams(current.newPriority);
      await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-a', newBeta.a);
      await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-b', newBeta.b);

      if (current.item.type != 'card') {
        // Update schedule
        const interval = current.manualInterval ?? nextInterval(current.ib);
        const newDue = addDays(todayMidnight(), interval);
        await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-interval', interval);
        await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-due', newDue.getTime());

        // Others
        await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-reps', current.ib.scheduling!.reps + 1);
      } 
    }
    await dispatch(nextRep());
  }
}

/*
*/
export const postponeRep = ({ interval }: { interval: number }) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const { learn } = getState();
    let current = learn.current;
    if (current) {
      const newDue = addDays(todayMidnight(), interval);
      await logseq.Editor.upsertBlockProperty(current.ib.uuid, 'ib-due', newDue.getTime());
    }
    await dispatch(nextRep());
  }
}

export const laterRep = ({ next=true }: { next?: boolean }) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    if (state.learn.queue.length > 1) {
      const current = state.learn.current!;
      let priority = Beta.fromProps(current.ib.betaParams)!.sample({});
      if (priority > state.learn.queue[1].priority) {
        priority = Math.max(0., state.learn.queue[1].priority - 0.01);
      }
      const item = {...current.item, priority };
      dispatch(queueItemAdded(item));
    }
    if (next) {
      await dispatch(nextRep());
    }
  }
}

export const doneRep = (opts?: {}) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const { learn } = getState();
    let current = learn.current;
    if (current) {
      await doneIb(current.ib);
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

export default learnSlice.reducer;
