import React, { useEffect } from "react";
import { useAppVisible } from "./logseq/events";
import { useAppDispatch, useAppSelector } from "./state/hooks";
import { MainView, toggleMainView } from "./state/viewSlice";
import MainWindow from "./main/MainWindow";
import MedxWindow from "./medx/MedxWindow";
import MediaFragment from "./medx/MediaFragment";
import { selectMedia } from "./medx/medxSlice";
import { finishRep } from "./learn/learnSlice";
import { renderMediaEmbed } from "./medx/macro";
import { isDark } from "./utils/logseq";
import { handleSettingsChanged, themeModeChanged } from "./state/appSlice";
import useMainSizeAndPosition from "./hooks/useMainSizeAndPos";
import { updateThemeStyle } from "./logseq/theme";
import { refreshCollections } from "./main/mainSlice";

export default function MainApp() {
  const visible = useAppVisible();
  const view = useAppSelector(state => state.view);
  const learning = useAppSelector(state => state.learn.learning);
  const currentIbData = useAppSelector(state => state.learn.current);
  const sizeAndPos = useMainSizeAndPosition();
  const dispatch = useAppDispatch();

  const state = useAppSelector(state => state);
  console.log(state);

  useEffect(() => {
    logseq.provideModel({
      toggleMain() {
        // dispatch(toggleMainView({ view: MainView.main }));
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
    //dispatch(getUserRefs());
    //dispatch(loadMedia());
  }, []);

  if (view.main == null) return <></>;

  let viewComponent: JSX.Element = <></>;
  switch (view.main?.view) {
    case MainView.main:
      viewComponent = <MainWindow />;
      break;
    case MainView.medx:
      viewComponent = <MedxWindow />;
      break;
  }
  
  return (
    <main
      className="bg-[color:var(--ls-primary-background-color)]"
      style={{
        width: sizeAndPos.width,
        height: sizeAndPos.height,
        left: sizeAndPos.left,
        top: sizeAndPos.top,
        position: 'relative',
        //backgroundColor: `var(--ls-primary-background-color, var(--ls-primary-background-color-plugin))`,
        //color: `var(--ls-primary-text-color, var(--ls-primary-text-color-plugin))`,
        //transition: 'background-color 0.3s, color 0.3s',
      }}>
      {viewComponent}
    </main>
  );
}
