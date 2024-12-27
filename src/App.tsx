import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "./state/hooks";
import { useAppVisible } from "./logseq/events";
import { MainView, toggleMainView } from "./state/viewSlice";
import MediaFragment from "./medx/MediaFragment";
import { MedxData, selectMedia } from "./medx/medxSlice";
import { finishRep } from "./learn/learnSlice";
import { renderMediaEmbed } from "./medx/macro";
import { refreshCollections } from "./main/mainSlice";
import { updateThemeStyle } from "./logseq/theme";
import { isDark } from "./utils/logseq";
import { handleSettingsChanged, themeModeChanged } from "./state/appSlice";

export default function App() {
  const visible = useAppVisible();
  const view = useAppSelector(state => state.view);
  const learning = useAppSelector(state => state.learn.learning);
  const currentIbData = useAppSelector(state => state.learn.current);
  const dispatch = useAppDispatch();

  const state = useAppSelector(state => state);
  console.log(state);

  useEffect(() => {
    logseq.provideModel({
      toggleMain() {
        if (view.main?.view != MainView.main) {
          dispatch(toggleMainView({ view: MainView.main }));
        }
      },
      async toggleMedxPopover(e: any) {
        const medFrag = MediaFragment.parse(e.dataset.macroArgs.split(','));
        const slotId = e.dataset.slotId;
        const blockUuid = e.dataset.blockUuid;
        if (medFrag && slotId && blockUuid) {
          const medxData = await dispatch(selectMedia({ medFrag, slotId, blockUuid }));
          if (medxData) {
            dispatch(toggleMainView({ view: MainView.medx }));
          }
        } else {
          logseq.UI.showMsg('Invalid media args', 'warning');
        }
      },
      async nextRep() {
        if (!learning) return;
        await dispatch(finishRep());
        const openIb = logseq.settings?.learnAutoOpen as boolean ?? true;
        if (currentIbData && openIb) {
          logseq.App.pushState('page', { name: currentIbData.ib.uuid });
        }
      },
      playRange(e: any) {
        const { slotId, mediaUrl, macroArgs } = e.dataset;
        const playerDiv = top?.document.getElementById(`medx-player-${mediaUrl}`);
        if (!playerDiv) {
          logseq.UI.showMsg('Media not found in page');
          return;
        }
        const args = MediaFragment.parse(macroArgs.split(','));
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
  }, []);

  function renderMedx(medxData: MedxData) {
  }

  return (<></>);
}
