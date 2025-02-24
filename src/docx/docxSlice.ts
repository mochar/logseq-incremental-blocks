import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { AppDispatch, RootState } from "../state/store";
import { IncrementalBlock } from "../types";
import { ibFromProperties, ibFromUuid } from "../ib/read";
import { highlightSelection } from "./selection";
import { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin";
import { createDoc, generateNewDocIbProps } from "./docx";
import { parseHtml } from "../utils/utils";

interface ActiveDocData {
  block: BlockEntity,
  ib: IncrementalBlock,
  page: PageEntity,
  content: string
}

interface DocxState {
  busy: boolean,
  data?: ActiveDocData
}

const initialState: DocxState = {
  busy: false
}

const docxSlice = createSlice({
  name: 'docx',
  initialState,
  reducers: {
    gotBusy(state, action: PayloadAction<boolean>) {
      state.busy = action.payload;
    },
    docLoaded(state, action: PayloadAction<ActiveDocData>) {
      state.data = action.payload;
    }
  }
});

export const { } = docxSlice.actions;

export const openDocFromUUID = (uuid: string) => {
  return async (dispatch: AppDispatch, getState: () => RootState) : Promise<boolean> => {
    const state = getState();
    if (state.docx.busy) return;
    dispatch(docxSlice.actions.gotBusy(true));

    //
    const block = await logseq.Editor.getBlock(uuid);
    const page = await logseq.Editor.getPage(block.parent.id);
    const ib = ibFromProperties(uuid, block.properties ?? {});
    if (ib == null) {
      logseq.UI.showMsg('Ib not found', 'error');
      dispatch(docxSlice.actions.gotBusy(false));
      return;
    }

    // Load content
    const storage = logseq.Assets.makeSandboxStorage();
    let content = await storage.getItem(`${uuid}.html`);
    if (!content) {
      logseq.UI.showMsg('Document not found', 'error');
      dispatch(docxSlice.actions.gotBusy(false));
      return;
    }
    content = content.replace('</head>', `
    <style type="text/css">
    .extract {
      background: pink;
      cursor: pointer;
    }
    </style>
    </head>`);

    dispatch(docxSlice.actions.docLoaded({ ib, content, page, block }));
    dispatch(docxSlice.actions.gotBusy(false));
  }
}

export const extractSelection = (document: Document) => {
  return async (dispatch: AppDispatch, getState: () => RootState) : Promise<boolean> => {
    const state = getState();
    if (state.docx.busy) return;
    const data = state.docx.data;
    if (!data) return;
    
    const selection = document.getSelection();
    if (!selection.rangeCount) {
      logseq.UI.showMsg('Nothing selected to extract', 'warning');
      return;
    }

    dispatch(docxSlice.actions.gotBusy(true));

    const uuid = await logseq.Editor.newBlockUUID();
    highlightSelection(selection, document, ['extract', `extract-${uuid}`]);

    const parent = data.block.parent.id === data.block.page.id ? data.page.uuid : data.block.uuid;
    const container = document.createElement('div');
    container.appendChild(selection.getRangeAt(0).cloneContents());
    const html = container.innerHTML;
    const extractDoc = parseHtml(data.content);
    extractDoc.body.innerHTML = html;
    // const title = selection.toString().split('\n')[0].slice(0, 100);
    const title = selection.toString().slice(0, 100);
    await createDoc({ title, html, parent, uuid });
    
    dispatch(docxSlice.actions.gotBusy(false));
  }
}

export default docxSlice.reducer;
