import React, { useEffect, useRef, useState } from "react";
import { queryIncrementalBlocks, useAppVisible } from "./utils";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import Popover from "./Popover";
import MainWindow from "./MainWindow";

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

        console.log('current', hovered, 'event', blockUuid);

        if (blockUuid == hovered?.block.uuid) {
          console.log('finna toggle');
          setHovered(null);
          if (!mainVisible && !hovered) {
            logseq.hideMainUI();
          }
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

  console.log('hovered', hovered?.block.uuid);

  if (!visible) return null;
  return (
    <main onClick={tryHide} className="bg-transparent fixed inset-0 flex">
      {mainVisible && <MainWindow />}
      {hovered && <Popover block={hovered!.block} slot={hovered!.slot} />}
    </main>
  );
}

export default App;
