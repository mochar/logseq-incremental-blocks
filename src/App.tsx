import React, { useEffect } from "react";
import IbPopover from "./widgets/Popover";
import MainWindow from "./widgets/MainWindow";
import { useAppVisible } from "./logseq/events";
import MedxPopover from "./medx/MedxPopover";
import { useAppDispatch, useAppSelector } from "./state/hooks";
import { MedxViewData, setView, toggleView, ViewType } from "./state/viewSlice";

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
      document.getElementById('ib-medx')?.contains(e.target)) {
      return;
    }
    dispatch(setView({ type: null }));
    window.logseq.hideMainUI();
  }

  if (!visible) return null;
  return (
    <main onClick={tryHide} className="bg-transparent fixed inset-0 flex">
      {view.type == ViewType.main && <MainWindow />}
      {view.type == ViewType.ib && <IbPopover block={view.data!.block} slot={view.data!.slotId} />}
      {view.type == ViewType.medx && <MedxPopover 
        block={view.data!.block} 
        slot={view.data!.slotId} 
        args={(view.data! as MedxViewData).medArgs}
      />
      }
    </main>
  );
}
