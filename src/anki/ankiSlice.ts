import { createAsyncThunk, createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch, RootState } from "../state/store";
import { getLogseqCards, invoke } from "./anki";
import Beta from "../algorithm/beta";
import { queryIbs } from "../logseq/query";
import { startAppListening } from "../state/listenerMiddleware";

interface CardMedia {
  front: string,
  back: string
}

export interface AnkiCard {
  uuid: string,
  type: string,
  breadcrumb: string,
  cardId: number,
  deckName: string,
  priority?: Beta
}

interface CurrentCard {
  deckName: string,
  cardId: number,
  buttons: number[],
  nextReviews: string[],
  date: Date
}

interface AnkiState {
  media: CardMedia,
  deckName: string,
  cards: AnkiCard[],
  refreshState: null | 'loading' | 'fulfilled' | 'failed',
  currentCard: CurrentCard | null
}

const initialState: AnkiState = {
  media: { front: '', back: '' },
  deckName: 'ib',
  cards: [],
  refreshState: null,
  currentCard: null
}

const ankiSlice = createSlice({
  name: 'anki',
  initialState,
  reducers: {
    cardOpened(state, action: PayloadAction<CurrentCard | null>) {
      let isSame = state.currentCard == action.payload;
      if (state.currentCard && action.payload) {
	isSame ||= state.currentCard.cardId == action.payload.cardId;
      }
      if (!isSame) {	
	state.currentCard = action.payload;
	console.log('Anki card changed:', action.payload);
      }
    }
  },
  extraReducers: builder => {
    builder
      .addCase(loadMedia.fulfilled, (state, action) => {
        if (action.payload != null) {
          state.media = action.payload;
        }
      })
      .addCase(getDueCards.pending, (state) => {
        state.cards = [];
        state.refreshState = 'loading';
      })
      .addCase(getDueCards.fulfilled, (state, action) => {
        state.cards = action.payload;
        state.refreshState = 'fulfilled';
      })
      .addCase(getDueCards.rejected, (state) => {
        state.refreshState= 'failed';
      })
  }
});

export const { cardOpened } = ankiSlice.actions;

export const loadMedia = createAsyncThunk<CardMedia | null, void, { state: RootState }>(
  'anki/loadMedia',
  async (_, { getState, dispatch }) => {
    const mediaFiles = [
      '_logseq_anki_sync.js',
      '_logseq_anki_sync.css',
      '_logseq_anki_sync_front.js',
      '_logseq_anki_sync_front.css',
      '_logseq_anki_sync_back.js',
      '_logseq_anki_sync_back.css'
    ];
    try {      
      const mediaContents = (await Promise.all(
        mediaFiles.map((mf) => invoke(
          'retrieveMediaFile', { filename: mf }))
      )).map(atob);
      const mediaComponents = mediaContents.map((c, i) => {
        if (mediaFiles[i].endsWith('js')) {
          return `<script type='text/javascript' async=false defer=false>${c}</script>`;
        } else {
          return `<style rel="stylesheet">${c}</style>`;
        }
      });
      const cardMedia: CardMedia = { 
        front: [0, 1, 2, 3].map((i) => mediaComponents[i]).join('\n'), 
        back: [0, 1, 4, 5].map((i) => mediaComponents[i]).join('\n')
      };
      console.log(cardMedia);
      return cardMedia;
    } catch (error) {
      return null;  
    }
  }
)

export const getDueCards = createAsyncThunk<AnkiCard[], void, { state: RootState }>(
  'anki/getDueCards',
  async (_, { getState, dispatch }) => {
    const cards = await getLogseqCards({ due: true }) as any[];
    const betasByUuid = (await queryIbs({
      uuids: cards.map((card) => card.fields.uuid.value),
     })).reduce(
      (map, ib) => { map.set(ib.uuid, ib.beta!); return map; }, 
      new Map<string, Beta>()
    );
    return cards.map<AnkiCard>((card) => {
      const uuid = card.fields.uuid.value;
      const parts = card.fields['uuid-type'].value.split('-');
      const breadcrumbHtml = card.fields['Breadcrumb'].value;
      const breadcrumb = (new DOMParser()).parseFromString(breadcrumbHtml, 'text/html').firstChild?.textContent ?? '';
      return {
        uuid,
        type: parts[parts.length-1],
        breadcrumb,
        cardId: card.cardId,
        deckName: card.deckName,
        priority: betasByUuid.get(uuid)
      };
    });
  },
  {
    condition: (_, { getState }) => {
      const { anki } = getState(); 
      if (anki.refreshState == 'loading') return false;
    }
  }
)

export const getCurrentReviewCard = () => {
  return async (dispatch: AppDispatch, getState: () => RootState): Promise<CurrentCard | null> => {
    let currentCard: CurrentCard | null;
    try {
      const currentCardData = await invoke('guiCurrentCard');
      currentCard = {
	deckName: currentCardData.deckName,
	cardId: currentCardData.cardId,
	buttons: currentCardData.buttons,
	nextReviews: currentCardData.nextReviews,
	date: new Date()
      };
    } catch (e: any) {
      currentCard = null;
    }
    dispatch(cardOpened(currentCard));
    return currentCard;
  }
}

/*
Match anki cards in filtered deck to priority order of ibs.
TODO: Check if cards are in the appropriate deck first.
They should be, but check anyway.
*/
export const orderCardsInDeck = ({ by }: { by: 'due' | 'queue' }) => {
  return async (dispatch: AppDispatch, getState: () => RootState) => {
    const state = getState();
    const queue = by == 'due' ? state.learn.dueIbs : state.learn.queue;
    const cardQibs = queue.filter((qib) => qib.cardId != undefined);
    let order = -100_000;
    const results = await Promise.all(cardQibs.map((cardQib) => {
      return invoke('setSpecificValueOfCard', 
        { card: cardQib.cardId, keys: ['due'], newValues: [order++]});
    }));
    console.log('due results', results);
  }
}

export default ankiSlice.reducer;

export const selectCardsByCriteria = createSelector.withTypes<RootState>()(
  [
    state => state.anki.deckName,
    state => state.anki.cards,
    (state, inFiltered: boolean) => inFiltered,
    (state, inFiltered: boolean, isIb: boolean) => isIb
  ],
  (deckName, cards, inFiltered, isIb) => {
    return cards.filter((card) => {
      let filter = true;
      if (inFiltered) filter &&= card.deckName == deckName;
      if (isIb) filter &&= card.priority != undefined
      return filter;
    });
  }
);

startAppListening({
  predicate(action, currentState, prevState) {
    if (currentState.learn.learning != prevState.learn.learning) {
      return true;
    }
    return currentState.learn.current?.qib.uuid != prevState.learn.current?.qib.uuid;
  },
  effect: async (action, listenerApi) => {
    listenerApi.cancelActiveListeners();
    const state = listenerApi.getState();
    if (!state.learn.learning || state.learn.current?.qib.cardId == undefined) return;
    while (true) {
      const reviewCard = await listenerApi.dispatch(getCurrentReviewCard());
      await listenerApi.delay(500);
    }
  }
});

