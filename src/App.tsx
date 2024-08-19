import React, { useEffect } from "react";
import IbPopover from "./widgets/Popover";
import MainWindow from "./widgets/MainWindow";
import { useAppVisible } from "./logseq/events";
import MedxPopover from "./medx/MedxPopover";
import { useAppDispatch, useAppSelector } from "./state/hooks";
import { IbViewData, InsertViewData, MedxViewData, setView, SlotViewData, toggleView, ViewType } from "./state/viewSlice";
import InsertPopover from "./medx/InsertPopover";

// This is our popup.
// The useAppVisible hook is used to close/open the popup.
export default function App() {
  const visible = useAppVisible();
  const view = useAppSelector(state => state.view);
  const dispatch = useAppDispatch();

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
      }
    });
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
  return (
    <main onClick={tryHide} className="bg-transparent fixed inset-0 flex">
      {viewComponent}
    </main>
  );
}
