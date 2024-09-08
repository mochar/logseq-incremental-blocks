import React, { useEffect } from "react";
import IbPopover from "./widgets/Popover";
import MainWindow from "./widgets/MainWindow";
import { useAppVisible } from "./logseq/events";
import MedxPopover from "./medx/MedxPopover";
import { useAppDispatch, useAppSelector } from "./state/hooks";
import { IbViewData, InsertViewData, MedxViewData, setView, toggleView, ViewType } from "./state/viewSlice";
import InsertPopover from "./medx/InsertPopover";
import { renderMediaEmbed } from "./medx/macro";
import MedxArgs from "./medx/args";
import { finishRep, getUserRefs, refreshDueIbs } from "./learn/learnSlice";
import { isDark } from "./utils/logseq";
import { themeModeChanged } from "./state/appSlice";

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
      toggleMedxPopover(e: any) {
        dispatch(toggleView({ 
          viewType: ViewType.medx, 
          blockUuid: e.dataset.blockUuid,
          slotId: e.dataset.slotId,
          medArgs: e.dataset.macroArgs
        }));
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
        const args = MedxArgs.parse(macroArgs.split(','));
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

    dispatch(getUserRefs());
  }, []);

  function tryHide(e: any) {
    if (document.getElementById('ib-main')?.contains(e.target) ||
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
    case ViewType.ib:
      const ibData = view.data! as IbViewData;
      viewComponent = <IbPopover block={ibData.block} slot={ibData.slotId} />;
      break;
    case ViewType.medx:
      const medxData = view.data! as MedxViewData;
      viewComponent = <MedxPopover 
        block={medxData.block} 
        slot={medxData.slotId} 
        args={medxData.medArgs}
      />;
      break;
    case ViewType.insert:
      const insertData = view.data! as InsertViewData;
      viewComponent = <InsertPopover block={insertData.block} />
      break;
  }

  if (!visible) return null;

  let classesIfCentered = '';
  switch (view.type) {
    case ViewType.medx:
    case ViewType.insert:
      classesIfCentered = 'backdrop-filter backdrop-blur-md items-center justify-center';
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
