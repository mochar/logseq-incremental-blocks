import { createAsyncThunk, createSelector, createSlice } from "@reduxjs/toolkit"
import { AppDispatch, RootState } from "../state/store";
import { getLogseqCards, invoke } from "./anki";
import Beta from "../algorithm/beta";
import { queryIbs, queryQueueIbs } from "../logseq/query";
import { QueueIb } from "../learn/learnSlice";

interface CardMedia {
  front: string,
  back: string
}

export interface AnkiCard {
  uuid: string,
  type: string,
  breadcrumb: string,
  cardId: string,
  deckName: string,
  priority?: Beta
}

interface AnkiState {
  media: CardMedia,
  deckName: string,
  cards: AnkiCard[],
  refreshState: null | 'loading' | 'fulfilled' | 'failed',
}

const initialState: AnkiState = {
  media: { front: '', back: '' },
  deckName: 'ib',
  cards: [],
  refreshState: null
}

const ankiSlice = createSlice({
  name: 'anki',
  initialState,
  reducers: {  },
  extraReducers: builder => {
    builder
      .addCase(loadMedia.fulfilled, (state, action) => {
        if (action.payload != null) {
          state.media = action.payload;
        }
      })
      .addCase(getDueCards.pending, (state) => {
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

export const {} = ankiSlice.actions;

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