import React, { useEffect, useState } from "react";
import { useAppVisible } from "./logseq/events";
import { useAppDispatch, useAppSelector } from "./state/hooks";
import { PARENT_MAIN_CONTAINER_ID } from "./globals";
import LearnBar from "./learn/LearnBar";
import { Popover } from "./learn/learnSlice";
import PriorityPopover from "./learn/PriorityPopover";

export default function BarApp() {
  const visible = useAppVisible();
  const dispatch = useAppDispatch();
  const learning = useAppSelector(state => state.learn.learning);
  const [sizeAndPos, setSizeAndPos] = useState({ width: innerWidth*.5, height: 50, left: 0, top: innerHeight-50 });

  useEffect(() => {
    const mainContainer = parent.document.getElementById(PARENT_MAIN_CONTAINER_ID);
    
    const updateSizeAndPosition = () => {
      if (mainContainer) {
        const rect = mainContainer.getBoundingClientRect();
        setSizeAndPos({
          // Don't know why the width overestimates by ~15px
          width: rect.width-15,
          height: sizeAndPos.height,
          left: rect.x,
          top: 300,// innerHeight - sizeAndPos.height,
        });
      }
    };

    const resizeObserver = new ResizeObserver(updateSizeAndPosition);
    if (mainContainer) resizeObserver.observe(mainContainer);
    updateSizeAndPosition();
    
    return () => {
      resizeObserver.disconnect();
    };    
  }, [])

  if (!learning) return <></>;

  return (
    <div
      id="ib-review-bar-content"
      className="flex justify-center"
      style={{
        position: "relative",
        left: sizeAndPos.left,
        width: sizeAndPos.width,
        transition: 'background-color 0.3s, color 0.3s',
      }}
    >
      <LearnBar />
    </div>
  );
}
