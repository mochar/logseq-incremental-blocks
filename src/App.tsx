import React, { useEffect, useState } from "react";
import { useAppVisible } from "./utils";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import Popover from "./widgets/Popover";
import MainWindow from "./widgets/MainWindow";
import { GLOBALS } from "./globals";

// This is our popup.
// The useAppVisible hook is used to close/open the popup.
function App() {
  const visible = useAppVisible();
  const [hovered, setHovered] = useState<{block: BlockEntity, slot: string} | null>(null);
  const [mainVisible, setMainVisible] = useState<boolean>(false);

  useEffect(() => {
    logseq.provideModel({
      toggleMain() {
        if (!mainVisible) {
          logseq.showMainUI();
        } else if (mainVisible && !hovered) {
          logseq.hideMainUI();
        }
        setMainVisible(!mainVisible);
      },
      async togglePopover(e: any) {
        const { blockUuid, slotId } = e.dataset;

        // Close if already selected
        if (blockUuid == hovered?.block.uuid) {
          setHovered(null);
          if (!mainVisible && !hovered) {
            logseq.hideMainUI();
          }
          return;
        }

        // Don't show when currently learning
        if (GLOBALS.learning) {
          logseq.UI.showMsg('Stop learning to update incremental blocks.')
          return;
        }

        logseq.showMainUI();

        const block = await logseq.Editor.getBlock(blockUuid);
        if (block) {
          setHovered({ block, slot: slotId });
        }
      },
      hidePopover(e: any) {
        setHovered(null);
      }
    });
  }, []);

  function tryHide(e: any) {
    if (document.getElementById('ib-main')?.contains(e.target) || 
        document.getElementById('ib-popover')?.contains(e.target)) {
          return;
        }
    setMainVisible(false);
    setHovered(null);
    window.logseq.hideMainUI();
  }

  if (!visible) return null;
  return (
    <main onClick={tryHide} className="bg-transparent fixed inset-0 flex">
      {mainVisible && <MainWindow />}
      {hovered && <Popover block={hovered!.block} slot={hovered!.slot} />}
    </main>
  );
}

export default App;
