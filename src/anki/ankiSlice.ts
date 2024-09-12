import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"
import { RootState } from "../state/store";
import { invoke } from "./anki";

interface CardMedia {
  front: string,
  back: string
}

interface AnkiState {
  media: CardMedia,
  deckName: string
}

const initialState: AnkiState = {
  media: { front: '', back: '' },
  deckName: 'ib'
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

export default ankiSlice.reducer;
