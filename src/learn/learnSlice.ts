import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import IncrementalBlock from "../IncrementalBlock";
import { getPriorityUpdate, PriorityUpdate } from "../algorithm/priority";
import { AppDispatch, RootState } from "../state/store";
import { getBlockHierarchyContent } from "../utils/logseq";
import { nextInterval } from "../algorithm/scheduling";
import { addDays, todayMidnight, toUnixTimestamp } from "../utils/datetime";
import { convertBlockToIb } from "../logseq/command";
import { getCardData, getCardReviews, getDeckReviews } from "../anki/anki";
import { logseq as PL } from "../../package.json";
import { startAppListening } from "../state/listenerMiddleware";
import { cardOpened, getCurrentReviewCard, orderCardsInDeck } from "../anki/ankiSlice";
import { QueueIb } from "../types";

export enum RepAction { 
  finish, // Rep finished, update priority and schedule
  postpone, // Move to another day, keep everything as is
  done, // Block is done, clean up and go to next rep
  next, // Simply pop the current ib, without action
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

interface Learn {
  learning: boolean,
  learnStart?: Date,
  // Whether or not anki cards should be part of queue
  anki: boolean,
  queue: QueueIb[],
  queueStatus: 'busy' | 'idle',
  current: CurrentIBData | null,
  // Whether or not we have started listening for new block events, as the listener
  // should only be installed once.
  blockListenerActive: boolean,
  // Whether or not to auto ib when learning
  autoIb: boolean
}

const initialState: Learn = {
  learning: false,
  anki: false,
  queue: [],
  queueStatus: 'idle',
  current: null,
  blockListenerActive: false,
  autoIb: logseq.settings?.learnAutoIb as boolean ?? false
}

const learnSlice = createSlice({
  name: 'learn',
  initialState,
  reducers: {
    learningStarted(state, action: PayloadAction<QueueIb[]>) {
      if (state.learning) return;
      state.learning = true;
      state.learnStart = new Date();
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
    manualIntervention(state, action: PayloadAction<{ priority?: number | null, interval?: number | null }>) {
      if (!state.current) return;
      const intervention = action.payload;
      if (intervention.priority !== undefined) state.current.manualPriority = intervention.priority ?? undefined;
      if (intervention.interval !== undefined) state.current.manualInterval = intervention.interval ?? undefined;
    },
    qibRemoved(state, action: PayloadAction<{ uuid: string, removeFromQueue?: boolean }>) {
      function removeFromQueue(queue: QueueIb[], uuid: string) {
        for (let i = 0; i < queue.length; i++) {
          if (queue[i].uuid == uuid) {
            queue.splice(i, 1);
          }
        }        
      }
      
      const uuid = action.payload.uuid;
      //removeFromQueue(state.dueIbs, uuid);
      if (action.payload.removeFromQueue ?? false) {
        removeFromQueue(state.queue, uuid);
      }
    },
    qibAdded(state, action: PayloadAction<{ qib: QueueIb, addToQueue?: boolean }>) {
      function squeezeInQueue(queue: QueueIb[], qib: QueueIb) {
        for (let i = 0; i < queue.length; i++) {
          if (queue[i].priority < qib.priority) {
            queue.splice(i, 0, qib);
            break;
          }
        }  
      }

      const qib = action.payload.qib;
      //squeezeInQueue(state.dueIbs, qib);
      if (action.payload.addToQueue ?? false) {
        squeezeInQueue(state.queue, qib);
      }
    }
  },
  extraReducers: builder => {
    builder
      .addCase(nextIb.pending, (state, action) => {
        state.queueStatus = 'busy';
      })
      .addCase(nextIb.fulfilled, (state, action) => {
        state.queueStatus = 'idle';
        if (state.current) {
          state.queue.shift();
        }
        state.current = action.payload;
      })
      .addCase(nextIb.rejected, (state, action) => {
        console.error('next ib rejected');
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

export const { manualIntervention, qibAdded, qibRemoved } = learnSlice.actions;


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
    reflectLearningChangedInGui(false);
  }
}

export const startLearning = () => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    let state = getState();
    const blockListenerActive = state.learn.blockListenerActive;
    const queue = state.learn.queue;
    
    await dispatch(getCurrentReviewCard());

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
    let { learn, anki } = getState();

    // Check if there's another element in the queue.
    // Since the current element stays at top of the queue,
    // the index that we have to check depends on if there's
    // currently an active element that is being reviewed.
    const getNextQib = (): QueueIb | undefined => learn.queue[learn.current ? 1 : 0];
    
    // If the next ib is a card, need to make sure that
    // we are in sync with anki queue.
    let nextQib = getNextQib();
    if (nextQib && learn.anki && nextQib.cardId) {
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
              dispatch(qibRemoved({
                uuid: card.fields.uuid.value,
                removeFromQueue: true
              }));
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

    // Retrieve next qib's data.
    // Since the next qib may potentially have changed if it was a
    // reviewed card, re-get the next qib in line.
    let nextIbData: CurrentIBData | null = null;
    ({ learn } = getState());
    nextQib = getNextQib();
    
    if (nextQib) {
      // Get the next ib and its metadata.
      const contents = await getBlockHierarchyContent(nextQib.uuid, 3);
      nextIbData = {
        qib: nextQib,
        ib: await IncrementalBlock.fromUuid(nextQib.uuid, { propsOnly: false }),
        start: new Date(),
        contents: contents,
        newContents: contents
      };
    }
    return nextIbData;
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

    const openIb = logseq.settings?.learnAutoOpen as boolean ?? true;
    if (openIb) {
      const { learn } = getState();
      if (learn.current) {
        logseq.App.pushState('page', { name: learn.current.qib.uuid })
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
    const { learn, anki } = getState();
    let current = learn.current;
    
    if (current) {
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

      if (!cardId) {
        // Update schedule
        const interval = current.manualInterval ?? nextInterval(current.ib);
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
      let priority = current.ib.beta!.sample({});
      if (priority > state.learn.queue[1].priority) {
        priority = Math.max(0., state.learn.queue[1].priority - 0.01);
      }
      const qib = {...current.qib, priority };
      dispatch(qibAdded({ qib, addToQueue: true }));
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

export default learnSlice.reducer;

startAppListening({
  actionCreator: cardOpened,
  effect: async (action, listenerApi) => {
    const reviewCard = action.payload;
    const state = listenerApi.getState();
    if (reviewCard !== null && state.learn.current!.qib.cardId != reviewCard.cardId) {
      // throw new Error('Anki deck and logseq queue out of sync ');
    }
  }
});
