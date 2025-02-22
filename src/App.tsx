import React, { useEffect } from "react";
import * as ReactDOM from "react-dom/client";
import { useAppDispatch, useAppSelector } from "./state/hooks";
import { EditorView, MainView, setEditorView, toggleMainView } from "./state/viewSlice";
import { selectFragmentBlock, selectMedia } from "./medx/medxSlice";
import { finishRep } from "./learn/learnSlice";
import { renderMediaEmbed } from "./medx/macro";
import { refreshCollections } from "./main/mainSlice";
import { updateThemeStyle } from "./logseq/theme";
import { isDark } from "./utils/logseq";
import { handleSettingsChanged, themeModeChanged } from "./state/appSlice";
import { Provider, useStore } from "react-redux";
import EditorApp from "./EditorApp";
import { addListener } from "@reduxjs/toolkit";
import { parseFragment } from "./medx/media";

export default function App() {
  const view = useAppSelector(state => state.view);
  const learning = useAppSelector(state => state.learn.learning);
  const currentIbData = useAppSelector(state => state.learn.current);
  const dispatch = useAppDispatch();
  const store = useStore();

  const state = useAppSelector(state => state);
  console.log(state);

  useEffect(() => {
    logseq.provideModel({
      toggleMain() {
        if (view.main?.view != MainView.main) {
          dispatch(toggleMainView({ view: MainView.main }));
        }
      },
      editBlock(e: any) {
        logseq.Editor.editBlock(e.dataset.blockUuid);
      },
      async nextRep() {
        if (!learning) return;
        await dispatch(finishRep());
        const openIb = logseq.settings?.learnAutoOpen as boolean ?? true;
        if (currentIbData && openIb) {
          logseq.App.pushState('page', { name: currentIbData.ib.uuid });
        }
      },
      async selectFragment(e: any) {
        const block = await logseq.Editor.getBlock(e.dataset.blockUuid);
        if (!block) {
          logseq.UI.showMsg('Block not found', 'error');
          return;
        }
        const isSource = block.page.id == block.parent.id;
        if (isSource) {
          dispatch(selectMedia(block.page.id));
        } else {
          dispatch(selectFragmentBlock(e.dataset));
        }
        if (view.editor == null || view.editor.view != EditorView.medx) {
          dispatch(setEditorView({ view: EditorView.medx }));
        }
      },
      playRange(e: any) {
        const { slotId, mediaUrl, macroArgs } = e.dataset;
        const playerDiv = top?.document.getElementById(`medx-player-${mediaUrl}`);
        if (!playerDiv) {
          logseq.UI.showMsg('Media not found in page');
          return;
        }
        const args = parseFragment(macroArgs.split(','));
        if (!args) {
          logseq.UI.showMsg('Invalid media args');
          return;
        }
        renderMediaEmbed({ playerDiv, args, play: true });
      },
      async refToMedia(e: any) {
        const { blockUuid } = e.dataset;
        const block = await logseq.Editor.getBlock(blockUuid);
        if (!block) return;
        const newContent = block.content.replace('{{renderer :medx_ref', '{{renderer :medx');
        await logseq.Editor.updateBlock(blockUuid, newContent);
      }
    });

    logseq.App.onCurrentGraphChanged((e) => dispatch(refreshCollections()));
    dispatch(refreshCollections());

    updateThemeStyle();
    isDark().then((dark) => dispatch(themeModeChanged(dark ? 'dark' : 'light')));
    logseq.App.onThemeModeChanged(({ mode }) => {
      dispatch(themeModeChanged(mode));
      updateThemeStyle();
    });

    logseq.onSettingsChanged((a, b) =>
      dispatch(handleSettingsChanged({ old: b, new: a })));

    const unsub = dispatch(addListener({
      actionCreator: setEditorView,
      effect: (action, listenerApi) => {
        console.log(action.payload);
        if (action.payload) {
          openEditorView();
        }
      }
    }));
    return unsub;
  }, []);

  function openEditorView() {
    const el = parent!.document.getElementById('app-single-container');
    if (!el) {
      logseq.UI.showMsg('Cannot find element', 'error');
      return;
    }
    
    parent!.document.body.classList.add('is-pdf-active')
    const root = ReactDOM.createRoot(el);
    function unmount() {
      root.unmount();
      parent!.document.body.classList.remove('is-pdf-active'); 
    }
    root.render(
      <React.StrictMode>
        <Provider store={store}>
          <EditorApp unmount={unmount} />
        </Provider>
      </React.StrictMode>
    );
  }

  return (<></>);
}
