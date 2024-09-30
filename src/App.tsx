import React, { useEffect } from "react";
import IbPopover from "./widgets/Popover";
import { useAppVisible } from "./logseq/events";
import { useAppDispatch, useAppSelector } from "./state/hooks";
import { IbViewData, InsertViewData, setView, toggleView, ViewType } from "./state/viewSlice";
import InsertPopover from "./medx/InsertPopover";
import { renderMediaEmbed } from "./medx/macro";
import { finishRep, getUserRefs, refreshDueIbs } from "./learn/learnSlice";
import { isDark } from "./utils/logseq";
import { handleSettingsChanged, themeModeChanged } from "./state/appSlice";
import MainWindow from "./main/MainWindow";
import LearnWindow from "./learn/LearnWindow";
import { selectMedia } from "./medx/medxSlice";
import MediaFragment from "./medx/MediaFragment";
import MedxWindow from "./medx/MedxWindow";

// This is our popup.
// The useAppVisible hook is used to close/open the popup.
export default function App() {
  const visible = useAppVisible();
  const dispatch = useAppDispatch();
  const view = useAppSelector(state => state.view);
  const learning = useAppSelector(state => state.learn.learning);
  const currentIbData = useAppSelector(state => state.learn.current);
  const themeMode = useAppSelector(state => state.app.themeMode);

  const state = useAppSelector(state => state);
  console.log(state);

  useEffect(() => {
    logseq.provideModel({
      toggleMain() {
        dispatch(toggleView({ viewType: ViewType.main }));
      },
      toggleIbPopover(e: any) {
        dispatch(toggleView({ 
          viewType: ViewType.ib, 
          blockUuid: e.dataset.blockUuid,
          slotId: e.dataset.slotId
        }));
      },
      async toggleMedxPopover(e: any) {
        const medFrag = MediaFragment.parse(e.dataset.macroArgs.split(','));
        const slotId = e.dataset.slotId;
        const blockUuid = e.dataset.blockUuid;
        if (medFrag && slotId && blockUuid) {
          const medxData = await dispatch(selectMedia({ medFrag, slotId, blockUuid }));
          if (medxData) {
            dispatch(toggleView({ viewType: ViewType.medx }));
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

    logseq.App.onCurrentGraphChanged((e) => dispatch(refreshDueIbs()));
    dispatch(refreshDueIbs());

    isDark().then((dark) => dispatch(themeModeChanged(dark ? 'dark' : 'light')));
    logseq.App.onThemeModeChanged(({ mode }) => dispatch(themeModeChanged(mode)));

    logseq.onSettingsChanged((a, b) =>
      dispatch(handleSettingsChanged({ old: b, new: a })));

    dispatch(getUserRefs());
    //dispatch(loadMedia());
  }, []);

  function tryHide(e: any) {
    if (document.getElementById('ib-learn')?.contains(e.target) ||
      document.getElementById('ib-main')?.contains(e.target) ||
      document.getElementById('ib-popover')?.contains(e.target) ||
      document.getElementById('ib-insert')?.contains(e.target) ||
      document.getElementById('ib-medx')?.contains(e.target)) {
      return;
    }
    dispatch(setView({ type: null }));
    window.logseq.hideMainUI();
  }

  let viewComponent: JSX.Element = <></>;
  switch (view.type) {
    case ViewType.main:
      viewComponent = <MainWindow />;
      break;
    case ViewType.learn:
      viewComponent = <LearnWindow />;
      break;
    case ViewType.ib:
      const ibData = view.data! as IbViewData;
      viewComponent = <IbPopover block={ibData.block} slot={ibData.slotId} />;
      break;
    case ViewType.medx:
      viewComponent = <MedxWindow />;
      break;
    case ViewType.insert:
      const insertData = view.data! as InsertViewData;
      viewComponent = <InsertPopover block={insertData.block} />
      break;
  }

  if (!visible) return null;

  let classesIfCentered = '';
  switch (view.type) {
    case ViewType.main:
    case ViewType.medx:
    case ViewType.insert:
      classesIfCentered = 'backdrop-brightness-90 items-center justify-center';
      break;
  }
  return (
    <main 
      className={`bg-transparent fixed inset-0 flex ${classesIfCentered} ${themeMode == 'dark' && 'dark'}`}
      onClick={tryHide} 
    >
      {viewComponent}
    </main>
  );
}
