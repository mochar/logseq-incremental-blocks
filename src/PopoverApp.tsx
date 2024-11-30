import React, { useEffect } from "react";
import IbPopover from "./widgets/Popover";
import { useAppVisible } from "./logseq/events";
import { useAppDispatch, useAppSelector } from "./state/hooks";
import { IbViewData, InsertViewData, PopoverView, setPopoverView, togglePopoverView } from "./state/viewSlice";
import InsertPopover from "./medx/InsertPopover";
import LearnWindow from "./learn/LearnWindow";

export default function PopoverApp() {
  const visible = useAppVisible();
  const dispatch = useAppDispatch();
  const view = useAppSelector(state => state.view);
  const themeMode = useAppSelector(state => state.app.themeMode);

  useEffect(() => {
    logseq.provideModel({
      toggleIbPopover(e: any) {
        dispatch(togglePopoverView({ 
          view: PopoverView.ib,
          blockUuid: e.dataset.blockUuid,
          slotId: e.dataset.slotId
        }));
      },
    });
  }, []);

  function tryHide(e: any) {
    if (document.getElementById('ib-learn')?.contains(e.target) ||
      document.getElementById('ib-popover')?.contains(e.target) ||
      document.getElementById('ib-insert')?.contains(e.target)) {
      return;
    }
    dispatch(setPopoverView(null));
    if (view.main == null) window.logseq.hideMainUI();
  }

  if (!visible || view.popover == null) return null;

  let viewComponent: JSX.Element = <></>;
  let classesIfCentered = '';
  switch (view.popover?.view) {
    case PopoverView.learn:
      viewComponent = <LearnWindow />;
      break;
    case PopoverView.ib:
      const ibData = view.popover.data! as IbViewData;
      viewComponent = <IbPopover block={ibData.block} slot={ibData.slotId} />;
      break;
    case PopoverView.insert:
      const insertData = view.popover.data! as InsertViewData;
      viewComponent = <InsertPopover block={insertData.block} />
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
