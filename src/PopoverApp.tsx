import React, { useEffect } from "react";
import IbPopover from "./widgets/Popover";
import { useAppVisible } from "./logseq/events";
import { useAppDispatch, useAppSelector } from "./state/hooks";
import { IbViewData, PopoverView, setPopoverView, togglePopoverView } from "./state/viewSlice";
import sanitize from "sanitize-filename";

export default function PopoverApp() {
  const visible = useAppVisible();
  const dispatch = useAppDispatch();
  const view = useAppSelector(state => state.view);
  const themeMode = useAppSelector(state => state.app.themeMode);

  useEffect(() => {
    logseq.provideModel({
      sanitize(s: string) {
        logseq.UI.showMsg(sanitize(s));
      },
      toggleIbPopover(e: any) {
        dispatch(togglePopoverView({ 
          view: PopoverView.ib,
          blockUuid: e.dataset.blockUuid
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
    // case PopoverView.learn:
    //   viewComponent = <LearnWindow />;
    //   break;
    case PopoverView.ib:
      const ibData = view.popover.data! as IbViewData;
      viewComponent = <IbPopover block={ibData.block} />;
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
