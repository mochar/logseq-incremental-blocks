import React, { useEffect, useRef, useState } from "react";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import IbPopover from "./widgets/Popover";
import MainWindow from "./widgets/MainWindow";
import { GLOBALS } from "./globals";
import { useAppVisible } from "./logseq/events";
import MedxPopover from "./medx/Popover";
import { parseArgs } from "./medx/macro";

enum View { main, ib, medx }

interface ToggleProps {
  uuid: string, 
  slotId: string, 
  payload?: any, 
  condition?: () => boolean 
}

// This is our popup.
// The useAppVisible hook is used to close/open the popup.
function App() {
  const visible = useAppVisible();
  const selected = useRef<{ block: BlockEntity, slot: string, payload: any } | null>(null);
  const [activeView, setActiveView] = useState<View | null>(null);

  useEffect(() => {
    logseq.provideModel({
      toggleMain() {
        if (activeView != View.main) {
          setActiveView(View.main);
          logseq.showMainUI();
        } else {
          setActiveView(null);
          logseq.hideMainUI();
        }
      },
      async toggleIbPopover(e: any) {
        const { blockUuid, slotId, macroArgs } = e.dataset;
        togglePopover(View.ib, { uuid: blockUuid, slotId, condition: () => {
          // Don't show when currently learning
          if (GLOBALS.learning) {
            logseq.UI.showMsg('Stop learning to update incremental blocks.')
            return false;
          }
          return true;
        }});
      },
      async toggleMedxPopover(e: any) {
        let { blockUuid, slotId, macroArgs } = e.dataset;
        const args = parseArgs(macroArgs.split(','));
        togglePopover(View.medx, { uuid: blockUuid, slotId, payload: args, condition: () => {
          if (args == null) {
            logseq.UI.showMsg('Invalid media args')
            return false;
          }
          return true;
        }});
      }
    });
  }, []);

  async function togglePopover(view: View, { uuid, slotId, payload, condition = () => true }: ToggleProps) {
    // Close if already selected
    if (activeView == view && uuid == selected.current?.block.uuid) {
      selected.current = null;
      setActiveView(null);
      logseq.hideMainUI();
      return;
    }

    if (!condition()) return;

    const block = await logseq.Editor.getBlock(uuid);
    if (block) {
      selected.current = { block, slot: slotId, payload: payload };
      setActiveView(view);
      logseq.showMainUI();
    } else {
      logseq.UI.showMsg('Block not found.')
    }
  }

  function tryHide(e: any) {
    if (document.getElementById('ib-main')?.contains(e.target) ||
      document.getElementById('ib-popover')?.contains(e.target) ||
      document.getElementById('ib-medx')?.contains(e.target)) {
      return;
    }
    setActiveView(null);
    window.logseq.hideMainUI();
  }

  if (!visible) return null;
  return (
    <main onClick={tryHide} className="bg-transparent fixed inset-0 flex">
      {activeView == View.main && <MainWindow />}
      {activeView == View.ib && <IbPopover block={selected.current!.block} slot={selected.current!.slot} />}
      {activeView == View.medx && <MedxPopover 
        block={selected.current!.block} 
        slot={selected.current!.slot} 
        args={selected.current!.payload}
      />
      }
    </main>
  );
}

export default App;
